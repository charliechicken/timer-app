export async function sendWithFormSubmit(
  email: string,
  subject: string,
  text: string,
): Promise<{ ok: boolean; pendingConfirm?: boolean; error?: string }> {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(email)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        _subject: subject,
        _captcha: "false",
        _template: "box",
        name: "Week Timer",
        message: text,
      }),
    },
  );

  const detail = await response.text();
  let parsed: { success?: string | boolean; message?: string } = {};
  try {
    parsed = JSON.parse(detail) as { success?: string | boolean; message?: string };
  } catch {
    parsed = {};
  }

  const success = parsed.success === true || parsed.success === "true";
  const confirm =
    `${parsed.message ?? detail}`.toLowerCase().includes("confirm") ||
    `${parsed.message ?? detail}`.toLowerCase().includes("activation");

  if (success) return { ok: true };
  if (confirm) return { ok: true, pendingConfirm: true };

  return {
    ok: false,
    error: parsed.message ?? (detail || "Inbox provider did not accept the email"),
  };
}
