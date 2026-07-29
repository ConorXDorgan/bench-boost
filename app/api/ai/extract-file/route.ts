import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 50_000;

type ExtractedKind = "pdf" | "docx" | "text";

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the ${MAX_FILE_BYTES / 1024 / 1024} MB limit` },
      { status: 413 },
    );
  }

  const fileName =
    "name" in file && typeof file.name === "string" ? file.name : "spec";
  const lower = fileName.toLowerCase();

  let kind: ExtractedKind;
  if (lower.endsWith(".pdf")) kind = "pdf";
  else if (lower.endsWith(".docx")) kind = "docx";
  else if (lower.endsWith(".txt") || lower.endsWith(".md")) kind = "text";
  else {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.",
      },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    if (kind === "pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        rawText = result.text;
      } finally {
        await parser.destroy();
      }
    } else if (kind === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      rawText = buffer.toString("utf-8");
    }
  } catch (err) {
    console.error("[extract-file] parser failed", { fileName, err });
    return NextResponse.json(
      {
        error:
          "Couldn't read the file. It may be corrupted, password-protected, or image-only (no text layer).",
      },
      { status: 422 },
    );
  }

  // Collapse runs of whitespace per line, drop blank lines, trim.
  const cleaned = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, " ").trimEnd())
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();

  if (!cleaned) {
    return NextResponse.json(
      {
        error:
          "No readable text found in the file. PDFs of scanned pages have no text layer — try a Word doc or a text-based PDF.",
      },
      { status: 422 },
    );
  }

  const truncated = cleaned.length > MAX_TEXT_CHARS;
  const text = truncated ? cleaned.slice(0, MAX_TEXT_CHARS) : cleaned;

  return NextResponse.json({
    ok: true,
    fileName,
    kind,
    text,
    chars: text.length,
    truncated,
  });
}
