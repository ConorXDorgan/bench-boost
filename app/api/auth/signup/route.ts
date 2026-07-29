import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

  if (!email?.endsWith("@accenture.com")) {
    return NextResponse.json({ error: "You must use an @accenture.com email address." }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const verificationToken = crypto.randomUUID();

  await prisma.user.create({
    data: { name: name.trim(), email, passwordHash, verificationToken, emailVerified: false },
  });

  await sendVerificationEmail(email, verificationToken);

  return NextResponse.json({ ok: true, message: "Check your Accenture inbox to verify your email." });
}
