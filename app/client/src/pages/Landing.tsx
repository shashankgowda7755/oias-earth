/**
 * Landing — the public "COMMUNITREE" homepage. Living Instrument design language:
 * a satellite Heartbeat Map hero where real forests pulse alive, big editorial
 * serif headlines, mono data, and the proof spine that no competitor delivers.
 *
 * Positioning: every other platform sells a birth certificate; we give your tree
 * a heartbeat — a verifiable life record that updates monthly and survives us.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartbeatMap } from '@/components/HeartbeatMap';
import { fetchForestsMap, fetchSponsors, type ForestPin, type Sponsor } from '@/lib/publicApi';
import '@/styles/earth.css';

function useCountUp(target: number, run: boolean, ms = 1400) {
  const [n, setN] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!run || started.current) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, run, ms]);
  return n;
}

function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.earth .reveal'));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const PROOF_STEPS = [
  { k: '01', t: 'Capture', d: 'In-app camera seals GPS + EXIF + device + a planter signature at the moment the photo is taken. No gallery uploads.' },
  { k: '02', t: 'Store forever', d: 'Each photo (<100KB) is written to Arweave — permanent, free to store, impossible to quietly delete.' },
  { k: '03', t: 'Anchor monthly', d: 'A Merkle root of every record is anchored on-chain each month. The timeline cannot be edited after the fact.' },
  { k: '04', t: 'Cross-check', d: 'Quarterly satellite / NDVI passes confirm the canopy is really there — and flag what is not.' },
];

const GAPS = [
  { t: 'Shown, not told', d: 'Everyone promises a geotag and a blockchain in the copy. We put the live, zoomable forest on the homepage. Proof is the first impression, not the receipt.' },
  { t: 'A life record, not a birth certificate', d: 'The whole field stops at planting day. We re-verify every tree every month. The page shows what is alive this month — not what we once planted.' },
  { t: 'Honest, including failure', d: 'We publish the dead trees too — real survival %, cause, and replacement status. The first faked record kills the category, so we weaponise honesty.' },
];

function SponsorLogo({ s }: { s: Sponsor }) {
  const [failed, setFailed] = useState(false);
  const item = (
    <div className="sponsor-item">
      {s.logo && !failed && (
        <img src={s.logo} alt={s.name ?? 'Sponsor'} loading="lazy" onError={() => setFailed(true)} />
      )}
      <span className="sponsor-name">{s.name}</span>
    </div>
  );
  return s.website ? (
    <a href={s.website} target="_blank" rel="noreferrer">{item}</a>
  ) : (
    item
  );
}

export default function Landing() {
  const [forests, setForests] = useState<ForestPin[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loaded, setLoaded] = useState(false);
  useReveal();

  useEffect(() => {
    fetchForestsMap()
      .then(setForests)
      .catch(() => undefined)
      .finally(() => setLoaded(true));
    fetchSponsors()
      .then(setSponsors)
      .catch(() => undefined);
  }, []);

  const treesAlive = forests.reduce((a, f) => a + f.tagged_trees, 0);
  const nForests = useCountUp(forests.length, loaded);
  const nTrees = useCountUp(treesAlive, loaded);
  const states = new Set(forests.map((f) => f.state).filter(Boolean)).size;
  const nStates = useCountUp(states, loaded);

  return (
    <div className="earth" style={{ background: 'var(--ink)', color: 'var(--surface)', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px clamp(20px,5vw,56px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, letterSpacing: '.01em' }}>
          <span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 14px rgba(182,255,60,.7)' }} />
          COMMUNITREE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,2.5vw,30px)', fontSize: 14 }}>
          <a href="#proof" style={{ color: 'var(--surface)', textDecoration: 'none', opacity: .85 }}>The proof</a>
          <Link to="/map" style={{ color: 'var(--surface)', textDecoration: 'none', opacity: .85 }}>Live map</Link>
          <Link to="/carbon" style={{ color: 'var(--surface)', textDecoration: 'none', opacity: .85 }}>Carbon</Link>
          <Link to="/verify" style={{ color: 'var(--surface)', textDecoration: 'none', opacity: .85 }}>Verify</Link>
          <a href="#business" style={{ color: 'var(--surface)', textDecoration: 'none', opacity: .85 }}>For business</a>
          <Link to="/dashboard" style={{ color: 'var(--ink)', background: 'var(--alive)', textDecoration: 'none', padding: '8px 16px', borderRadius: 999, fontWeight: 600 }}>Dashboard</Link>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ position: 'relative', height: '100vh', minHeight: 620, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <HeartbeatMap forests={forests} interactive={false} zoom={5} />
        </div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(180deg, rgba(15,29,34,.78) 0%, rgba(15,29,34,.35) 38%, rgba(15,29,34,.82) 100%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(20px,5vw,56px)', maxWidth: 1100, pointerEvents: 'none' }}>
          <div className="mono" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.22em', textTransform: 'uppercase', marginBottom: 22 }}>Living proof · verified monthly</div>
          <h1 className="serif" style={{ fontWeight: 300, fontSize: 'clamp(38px,6.4vw,82px)', lineHeight: 1.02, letterSpacing: '-.02em', margin: 0, maxWidth: '16ch' }}>
            Anyone can plant a tree.<br /><em style={{ fontStyle: 'italic', fontWeight: 600, color: 'var(--alive)' }}>We prove it's still alive.</em>
          </h1>
          <p style={{ marginTop: 24, maxWidth: '52ch', fontSize: 'clamp(15px,1.6vw,19px)', color: '#cfd8d6', lineHeight: 1.6 }}>
            Every tree gets a permanent, tamper-proof life record — GPS-verified, photographed monthly, anchored on-chain, free to store forever. The only place "alive" is a fact you can check.
          </p>
          <div style={{ display: 'flex', gap: 14, marginTop: 34, flexWrap: 'wrap', pointerEvents: 'auto' }}>
            <Link to="/map" style={{ background: 'var(--alive)', color: 'var(--ink)', textDecoration: 'none', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 15, boxShadow: '0 0 26px rgba(182,255,60,.35)' }}>Explore the live map →</Link>
            <a href="#business" style={{ border: '1px solid var(--line)', color: 'var(--surface)', textDecoration: 'none', padding: '14px 26px', borderRadius: 999, fontWeight: 600, fontSize: 15, background: 'rgba(255,255,255,.04)' }}>For business</a>
          </div>
          {/* Live impact */}
          <div style={{ display: 'flex', gap: 'clamp(28px,5vw,64px)', marginTop: 'clamp(36px,6vh,64px)', flexWrap: 'wrap' }}>
            {[
              { v: nForests, l: 'forests live' },
              { v: nTrees, l: 'trees verified alive' },
              { v: nStates, l: 'states' },
            ].map((s) => (
              <div key={s.l}>
                <div className="mono" style={{ fontSize: 'clamp(28px,4vw,46px)', color: 'var(--alive)', lineHeight: 1 }}>{s.v.toLocaleString()}</div>
                <div style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9fb0ad', marginTop: 8 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 10, color: '#9fb0ad', fontSize: 12, letterSpacing: '.1em' }}>scroll</div>
      </header>

      {/* Sponsor marquee */}
      {sponsors.length > 0 && (
        <section style={{ padding: 'clamp(26px,4vh,42px) 0', background: 'var(--ink-2)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '.22em', textTransform: 'uppercase', color: '#9fb0ad' }}>Backed by</span>
          </div>
          <div className="marquee">
            <div className="marquee-track">
              {[...sponsors, ...sponsors].map((s, i) => (
                <SponsorLogo key={`${s.name}-${i}`} s={s} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The gap / proof not promises */}
      <section id="proof" style={{ padding: 'clamp(64px,9vh,120px) clamp(20px,5vw,56px)', background: 'var(--surface)', color: 'var(--ink)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mono reveal" style={{ color: 'var(--pine)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Proof, not promises</div>
          <h2 className="serif reveal" style={{ fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', lineHeight: 1.1, margin: '0 0 12px', maxWidth: '20ch' }}>The whole field sells a certificate. We maintain a life record.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 22, marginTop: 44 }}>
            {GAPS.map((g) => (
              <div key={g.t} className="reveal" style={{ background: 'var(--paper)', border: '1px solid var(--line-ink)', borderRadius: 14, padding: 26 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--alive)', boxShadow: '0 0 10px rgba(143,207,46,.8)', marginBottom: 16 }} />
                <h3 className="serif" style={{ fontWeight: 600, fontSize: 21, margin: '0 0 8px' }}>{g.t}</h3>
                <p style={{ fontSize: 14.5, color: '#3f4a48', lineHeight: 1.6, margin: 0 }}>{g.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof spine */}
      <section style={{ padding: 'clamp(64px,9vh,120px) clamp(20px,5vw,56px)', background: 'var(--ink)', color: 'var(--surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mono reveal" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>How a life record works</div>
          <h2 className="serif reveal" style={{ fontWeight: 600, fontSize: 'clamp(28px,4vw,46px)', lineHeight: 1.1, margin: '0 0 12px', maxWidth: '22ch' }}>Four steps, sealed at the source, verifiable by anyone.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginTop: 44 }}>
            {PROOF_STEPS.map((s) => (
              <div key={s.k} className="reveal" style={{ borderTop: '2px solid var(--alive)', paddingTop: 18 }}>
                <div className="mono" style={{ color: 'var(--alive)', fontSize: 13, marginBottom: 8 }}>{s.k}</div>
                <h3 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '0 0 8px' }}>{s.t}</h3>
                <p style={{ fontSize: 14, color: '#aebcb9', lineHeight: 1.6, margin: 0 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof grade */}
      <section style={{ padding: 'clamp(64px,9vh,120px) clamp(20px,5vw,56px)', background: 'var(--surface)', color: 'var(--ink)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 40, alignItems: 'center' }}>
          <div className="reveal">
            <div className="mono" style={{ color: 'var(--pine)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>Proof Grade</div>
            <h2 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(26px,3.6vw,40px)', lineHeight: 1.12, margin: '0 0 14px' }}>A credit rating for forests.</h2>
            <p style={{ fontSize: 16, color: '#3f4a48', lineHeight: 1.65, maxWidth: '46ch' }}>
              Every forest carries a single letter grade computed from monitoring cadence, photo recency, satellite agreement, and survival rate. The proof buyers' auditors actually want — at a glance, on every CSR export.
            </p>
          </div>
          <div className="reveal" style={{ background: 'var(--ink)', color: 'var(--surface)', borderRadius: 18, padding: 30, border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Vandalur Forest</div>
              <div className="mono" style={{ fontSize: 11, color: '#9fb0ad' }}>KISVAN63</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <div className="serif" style={{ fontSize: 76, fontWeight: 600, color: 'var(--alive)', lineHeight: 1 }}>A+</div>
              <div className="mono" style={{ fontSize: 13, color: '#aebcb9', lineHeight: 1.8 }}>
                survival 94.2%<br />photo age 6 days<br />NDVI ✓ confirmed<br />anchored monthly
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map band */}
      <section style={{ position: 'relative', height: 460, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}><HeartbeatMap forests={forests} interactive={false} zoom={5} /></div>
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(90deg, rgba(15,29,34,.92) 0%, rgba(15,29,34,.5) 60%, rgba(15,29,34,.2) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 clamp(20px,5vw,56px)', maxWidth: 1100, margin: '0 auto' }}>
          <h2 className="serif" style={{ fontWeight: 600, fontSize: 'clamp(26px,4vw,44px)', margin: '0 0 12px', maxWidth: '16ch' }}>See every living tree on the map.</h2>
          <p style={{ color: '#cfd8d6', maxWidth: '44ch', marginBottom: 24, fontSize: 16 }}>Real GPS, real photos, real survival — no login, nothing to take on faith.</p>
          <Link to="/map" style={{ alignSelf: 'flex-start', background: 'var(--alive)', color: 'var(--ink)', textDecoration: 'none', padding: '14px 26px', borderRadius: 999, fontWeight: 700, fontSize: 15 }}>Open the live map →</Link>
        </div>
      </section>

      {/* Business */}
      <section id="business" style={{ padding: 'clamp(64px,9vh,120px) clamp(20px,5vw,56px)', background: 'var(--ink-2)', color: 'var(--surface)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mono reveal" style={{ color: 'var(--alive)', fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 14 }}>For business · CSR</div>
          <h2 className="serif reveal" style={{ fontWeight: 600, fontSize: 'clamp(26px,3.8vw,42px)', lineHeight: 1.12, margin: '0 0 30px', maxWidth: '22ch' }}>Fund a forest. Get proof your auditors can't argue with.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20 }}>
            {[
              { t: 'BRSR / ESG exports', d: 'Survival-rate reporting and audit-ready exports, per forest, with Proof Grades baked in.' },
              { t: 'Branded forest microsite', d: 'A live, shareable proof page for your cohort — your logo, real trees, real coordinates.' },
              { t: 'White-label platform', d: 'Run your own branded tree programme on the proof engine. You own your data and brand.' },
            ].map((c) => (
              <div key={c.t} className="reveal" style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 26, background: 'rgba(255,255,255,.03)' }}>
                <h3 className="serif" style={{ fontWeight: 600, fontSize: 20, margin: '0 0 8px' }}>{c.t}</h3>
                <p style={{ fontSize: 14, color: '#aebcb9', lineHeight: 1.6, margin: 0 }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px clamp(20px,5vw,56px)', background: 'var(--ink)', color: '#7e8e8a', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--alive)' }} />
          COMMUNITREE — living proof, verified monthly
        </div>
        <div style={{ display: 'flex', gap: 22 }}>
          <Link to="/map" style={{ color: '#9fb0ad', textDecoration: 'none' }}>Live map</Link>
          <Link to="/dashboard" style={{ color: '#9fb0ad', textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
