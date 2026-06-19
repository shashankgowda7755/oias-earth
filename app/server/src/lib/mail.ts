/**
 * Gift email via Resend. Every tree can be gifted to someone (name + email);
 * sending emails them a link to that tree's live certificate / report card.
 * Gated on RESEND_API_KEY — if unset, mailReady() is false and the API returns
 * a clear "configure email" error instead of throwing opaquely.
 *
 * RESEND_FROM overrides the sender. Resend's default onboarding@resend.dev only
 * delivers to the account owner in test mode; verify a domain for real recipients.
 */
import { Resend } from 'resend';

export function mailReady(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface GiftEmailInput {
  to: string;
  recipientName: string | null;
  species: string | null;
  treeUid: string | null;
  forestName: string | null;
  certUrl: string;
  message?: string | null;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export async function sendGiftEmail(input: GiftEmailInput): Promise<{ id?: string }> {
  if (!process.env.RESEND_API_KEY) throw new Error('email not configured — set RESEND_API_KEY (resend.com)');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM || 'Be The Tree Hugger <onboarding@resend.dev>';
  const name = input.recipientName?.trim() || 'Friend';
  const species = input.species || 'a sapling';
  const note = input.message?.trim()
    ? `<p style="margin:14px 0;padding:12px 14px;background:#eef6ef;border-left:3px solid #1d6b3f;border-radius:6px;color:#33454c">${esc(input.message.trim())}</p>`
    : '';
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#16282e">
    <div style="background:#16282e;color:#b6ff3c;padding:18px 22px;border-radius:12px 12px 0 0;font-weight:700">🌳 Be The Tree Hugger</div>
    <div style="border:1px solid #e2e7e3;border-top:none;border-radius:0 0 12px 12px;padding:22px">
      <p style="font-size:16px">Hi ${esc(name)},</p>
      <p>A <strong>${esc(species)}</strong> ${input.treeUid ? `(<span style="font-family:monospace">${esc(input.treeUid)}</span>)` : ''} has been planted in your name${input.forestName ? ` at <strong>${esc(input.forestName)}</strong>` : ''}.</p>
      <p>This isn't a one-time certificate — it's a <strong>living record</strong>. Every monitoring visit, with photos and measurements, is added to your tree's page. Watch it grow, and verify it's alive, any time:</p>
      ${note}
      <p style="text-align:center;margin:22px 0">
        <a href="${input.certUrl}" style="background:#1d6b3f;color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:700;display:inline-block">View your tree's certificate →</a>
      </p>
      <p style="font-size:12px;color:#5a6b72">Carbon + oxygen figures shown are estimated, verification-ready removals — not issued credits. Thank you for growing real proof.</p>
    </div>
  </div>`;
  const { data, error } = await resend.emails.send({
    from,
    to: input.to,
    subject: `🌳 Your tree is planted — ${species}${input.treeUid ? ` (${input.treeUid})` : ''}`,
    html,
  });
  if (error) throw new Error(error.message || 'email send failed');
  return { id: data?.id };
}
