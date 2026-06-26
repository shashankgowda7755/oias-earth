/**
 * /settings/email — SuperAdmin only.
 * Global sender identity + default To/CC address lists.
 * Per-forest overrides TBD in forest edit screen.
 */
import { useEffect, useState } from 'react';
import { Button, useToast } from '../../components';
import { api } from '../../lib/api';

interface EmailConfig {
  display_name: string;
  from_address: string;
  reply_to: string;
  to_emails: string[];
  cc_emails: string[];
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseEmailInput(raw: string): string[] {
  return raw.split(/[,;\s]+/).map((e) => e.trim()).filter((e) => EMAIL_RE.test(e));
}

function AddressList({
  emails,
  onAdd,
  onRemove,
  placeholder,
}: {
  emails: string[];
  onAdd: (e: string) => void;
  onRemove: (e: string) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');
  const commit = () => {
    if (!input.trim()) return;
    parseEmailInput(input).forEach(onAdd);
    setInput('');
  };
  return (
    <div>
      {emails.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {emails.map((e) => (
            <span key={e} className="inline-flex items-center gap-1 rounded-full border border-border bg-appbg px-2 py-0.5 text-xs text-textSecondary">
              {e}
              <button type="button" onClick={() => onRemove(e)} className="ml-0.5 leading-none text-textSecondary hover:text-textPrimary">×</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={placeholder}
        className="w-full rounded-button border border-border bg-appbg px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none"
      />
      <p className="mt-1 text-xs text-textSecondary">Press Enter or comma to add. Multiple addresses OK.</p>
    </div>
  );
}

export default function EmailSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<EmailConfig>({
    display_name: 'OIAS Earth',
    from_address: '',
    reply_to: '',
    to_emails: [],
    cc_emails: [],
  });

  useEffect(() => {
    api.get('/settings/email')
      .then(({ data }) => {
        const d = data?.data;
        if (d) {
          setCfg({
            display_name: d.display_name ?? 'OIAS Earth',
            from_address: d.from_address ?? '',
            reply_to: d.reply_to ?? '',
            to_emails: d.to_emails ?? [],
            cc_emails: d.cc_emails ?? [],
          });
        }
      })
      .catch(() => toast.error('Could not load email config.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof EmailConfig) => (v: string) => setCfg((c) => ({ ...c, [k]: v }));

  const addEmail = (field: 'to_emails' | 'cc_emails') => (email: string) => {
    setCfg((c) => {
      const seen = new Set(c[field].map((e) => e.toLowerCase()));
      if (seen.has(email.toLowerCase())) return c;
      return { ...c, [field]: [...c[field], email] };
    });
  };

  const removeEmail = (field: 'to_emails' | 'cc_emails') => (email: string) => {
    setCfg((c) => ({ ...c, [field]: c[field].filter((e) => e !== email) }));
  };

  const handleSave = async () => {
    if (!cfg.display_name.trim()) { toast.error('Display name is required.'); return; }
    if (!EMAIL_RE.test(cfg.from_address)) { toast.error('Valid from address is required.'); return; }
    if (cfg.reply_to && !EMAIL_RE.test(cfg.reply_to)) { toast.error('Invalid reply-to address.'); return; }
    setSaving(true);
    try {
      await api.put('/settings/email', {
        display_name: cfg.display_name.trim(),
        from_address: cfg.from_address.trim(),
        reply_to: cfg.reply_to.trim() || null,
        to_emails: cfg.to_emails,
        cc_emails: cfg.cc_emails,
      });
      toast.success('Email config saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section aria-label="Email settings"><p className="p-8 text-sm text-textSecondary">Loading…</p></section>;

  return (
    <section aria-label="Email settings" className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-xl font-semibold text-textPrimary">Email configuration</h1>

      {/* Sender */}
      <div className="rounded-card border border-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-textSecondary">Sender</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-textSecondary mb-1" htmlFor="ec-name">Display name</label>
            <input id="ec-name" type="text" value={cfg.display_name} onChange={(e) => set('display_name')(e.target.value)}
              className="w-full rounded-button border border-border bg-appbg px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm text-textSecondary mb-1" htmlFor="ec-from">From address <span className="text-danger text-xs">required</span></label>
            <input id="ec-from" type="email" value={cfg.from_address} onChange={(e) => set('from_address')(e.target.value)}
              className="w-full rounded-button border border-border bg-appbg px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-textSecondary mb-1" htmlFor="ec-reply">Reply-to <span className="text-xs text-textSecondary">(optional)</span></label>
            <input id="ec-reply" type="email" value={cfg.reply_to} onChange={(e) => set('reply_to')(e.target.value)}
              placeholder="hello@oiasearth.com"
              className="w-full rounded-button border border-border bg-appbg px-3 py-2 text-sm text-textPrimary focus:border-primary focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Global To */}
      <div className="rounded-card border border-border bg-surface p-5 space-y-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-textSecondary">Global To addresses</h2>
          <p className="mt-1 text-xs text-textSecondary">Extra recipients on every report send, on top of the sponsor's email (auto-added per send).</p>
        </div>
        <AddressList
          emails={cfg.to_emails}
          onAdd={addEmail('to_emails')}
          onRemove={removeEmail('to_emails')}
          placeholder="director@oiasearth.com"
        />
      </div>

      {/* Global CC */}
      <div className="rounded-card border border-border bg-surface p-5 space-y-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wide text-textSecondary">Global CC addresses</h2>
          <p className="mt-1 text-xs text-textSecondary">CC on every report send. Forest contact email is always auto-added. Per-forest CC overrides this list for that forest.</p>
        </div>
        <AddressList
          emails={cfg.cc_emails}
          onAdd={addEmail('cc_emails')}
          onRemove={removeEmail('cc_emails')}
          placeholder="team@oiasearth.com"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
      </div>
    </section>
  );
}
