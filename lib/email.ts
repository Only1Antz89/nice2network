import "server-only";

export async function sendVerificationEmail(input: { email: string; firstName: string; verificationUrl: string }) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV === "production") throw new Error("Email delivery is not configured");
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [input.email],
      subject: "Verify your nice 2 network email",
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px;color:#111"><div style="width:38px;height:38px;border-radius:50%;background:#111;color:#fff;display:grid;place-items:center;font-weight:700;font-size:12px">n2</div><h1 style="font-size:28px;letter-spacing:-1px;margin:28px 0 10px">One quick check, ${escapeHtml(input.firstName)}.</h1><p style="color:#666;line-height:1.6">Verify your email to continue building your profile and meet the right people for your work.</p><a href="${input.verificationUrl}" style="display:inline-block;margin-top:18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700">Verify my email</a><p style="font-size:12px;color:#888;margin-top:28px">This link expires in 60 minutes. If you didn’t create this account, you can ignore this email.</p></div>`,
      text: `Hi ${input.firstName}, verify your nice 2 network email: ${input.verificationUrl}\n\nThis link expires in 60 minutes.`,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
  return { delivered: true };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
