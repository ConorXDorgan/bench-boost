import { readFile } from "node:fs/promises";
import path from "node:path";
import { ingestExcelBuffer } from "@/lib/excel/parse";
import { prisma } from "@/lib/db";

const DEFAULT_SAMPLE = "UpdatedView.xlsx";

async function main() {
  const samplePath = process.env.SAMPLE_XLSX
    ? path.resolve(process.env.SAMPLE_XLSX)
    : path.resolve("data", DEFAULT_SAMPLE);

  console.log(`Reading sample workbook: ${samplePath}`);
  const buffer = await readFile(samplePath);

  const summary = await ingestExcelBuffer(buffer, "seed");
  console.log("Ingest complete.");
  console.log(`  Snapshot ID:   ${summary.snapshotId}`);
  console.log(`  Snapshot date: ${summary.snapshotDate.toISOString().slice(0, 10)}`);
  console.log(`  Resources:     ${summary.resourceCount}`);
  console.log(
    `  Buckets:       available=${summary.bucketCounts.available}, ` +
      `coming=${summary.bucketCounts.coming}, ` +
      `not_available=${summary.bucketCounts.not_available} ` +
      `(of which unknown=${summary.unknownCount})`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
