const TOKEN_KEY = "week-timer-gmail-token";

export function saveGmailToken(token: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getGmailToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sendMailWithGmail(payload: {
  to: string;
  subject: string;
  text: string;
  token: string;
}): Promise<{ ok: boolean; error?: string; unauthorized?: boolean }> {
  const raw = toBase64Url(
    [
      `From: ${payload.to}`,
      `To: ${payload.to}`,
      `Subject: ${payload.subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      payload.text,
    ].join("\r\n"),
  );

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    },
  );

  if (response.status === 401) {
    saveGmailToken(null);
    return { ok: false, unauthorized: true, error: "Google login expired. Sign in again." };
  }

  if (!response.ok) {
    const detail = await response.text();
    if (detail.toLowerCase().includes("accessnotconfigured") || response.status === 403) {
      return {
        ok: false,
        error: "Gmail sending is not enabled on this Google project yet.",
      };
    }
    return { ok: false, error: detail };
  }

  return { ok: true };
}
