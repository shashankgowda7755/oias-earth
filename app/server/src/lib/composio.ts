/**
 * Composio Gmail send — the proven path for emailing sponsor reports.
 *
 * Uses Composio's v3 tool-execute API (no SDK) to run GMAIL_SEND_EMAIL against
 * a connected Gmail account. Config comes from env (never hard-coded):
 *   COMPOSIO_API_KEY        ak_… (the workspace API key)
 *   COMPOSIO_GMAIL_ACCOUNT  ca_… (the connected Gmail account id)
 *   COMPOSIO_USER_ID        the entity/user id that owns that account
 * Returns a typed result; callers decide how to surface success/failure. Never
 * throws on a send failure (returns {ok:false}) so a bad send can't 500 a route.
 */
const COMPOSIO_BASE = 'https://backend.composio.dev/api/v3';

export interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export function composioConfigured(): boolean {
  return Boolean(
    process.env.COMPOSIO_API_KEY &&
      process.env.COMPOSIO_GMAIL_ACCOUNT &&
      process.env.COMPOSIO_USER_ID,
  );
}

export async function sendGmail(opts: {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
}): Promise<SendResult> {
  const key = process.env.COMPOSIO_API_KEY;
  const account = process.env.COMPOSIO_GMAIL_ACCOUNT;
  const userId = process.env.COMPOSIO_USER_ID;
  if (!key || !account || !userId) {
    return { ok: false, error: 'Email not configured (COMPOSIO_API_KEY / GMAIL_ACCOUNT / USER_ID).' };
  }
  try {
    const resp = await fetch(`${COMPOSIO_BASE}/tools/execute/GMAIL_SEND_EMAIL`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connected_account_id: account,
        user_id: userId,
        arguments: {
          recipient_email: opts.to,
          subject: opts.subject,
          is_html: true,
          body: opts.html,
          ...(opts.cc && opts.cc.length ? { cc: opts.cc } : {}),
        },
      }),
    });
    const j = (await resp.json()) as {
      successful?: boolean;
      error?: { message?: string };
      data?: { id?: string; response_data?: { id?: string } };
    };
    if (j.successful) {
      const id = j.data?.response_data?.id ?? j.data?.id;
      return { ok: true, messageId: id };
    }
    return { ok: false, error: j.error?.message ?? `Composio error (${resp.status}).` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'send failed' };
  }
}
