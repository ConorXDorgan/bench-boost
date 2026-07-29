import { Resend } from "resend";

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const verifyUrl = `${process.env.AUTH_URL}/api/auth/verify?token=${token}`;
  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "bench-tool@accenture.com",
    to,
    subject: "Verify your Bench Tool account",
    html: `
      <p>Click the link below to verify your Accenture email and activate your Bench Tool account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link does not expire. If you didn't sign up, you can ignore this email.</p>
    `,
  });
}
