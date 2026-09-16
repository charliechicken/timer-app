import { sendWithFormSubmit } from "./inboxMail";

async function sendWithResend(
  email: string,
  subject: string,
  text: string,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false };

  const from = process.env.TIMER_FROM_EMAIL ?? "Week Timer <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [email], subject, text, headers }),
  });

  if (!response.ok) {
    return { ok: false, error: await response.text() };
  }
  return { ok: true };
}

export async function deliverEmail(
  email: string,
  subject: string,
  text: string,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; pendingConfirm?: boolean; error?: string; provider?: string }> {
  const resend = await sendWithResend(email, subject, text, headers);
  if (resend.ok) return { ok: true, provider: "resend" };

  const fallback = await sendWithFormSubmit(email, subject, text);
  if (fallback.ok) {
    return {
      ok: true,
      provider: "inbox",
      pendingConfirm: fallback.pendingConfirm ?? false,
    };
  }

  return {
    ok: false,
    error: resend.error || fallback.error || "Could not send email",
  };
}
