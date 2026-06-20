/**
 * gen-schema-html — turn the live DB schema (dumped to /tmp/schema.json) into a
 * single interactive HTML explorer (docs/SCHEMA.html). Grouped by domain,
 * click a table to highlight its relationships, search, toggle legacy tables.
 *   node scripts/gen-schema-html.js
 */
const fs = require('fs');
const S = JSON.parse(fs.readFileSync('/tmp/schema.json', 'utf8'));

// domain grouping for the live product tables; everything else => Legacy.
const DOMAINS = {
  'Forests & Trees': ['forests', 'forest_trees', 'master_plantspecies', 'tree_status_master', 'forest_boxes', 'forest_clusters'],
  'Monitoring & Carbon': ['forest_plant_timelines', 'forest_plant_timeline_assets', 'forest_tree_carbon_ledger', 'carbon_anchors'],
  '360 Tour': ['forest_scenes', 'scene_hotspots', 'scene_links', 'forest_panoramas'],
  'Sponsors & Gifting': ['sponsors', 'forest_sponsors', 'gift_forest_plants', 'employees', 'forests_employees'],
  'Users & Roles': ['user_profiles', 'user_roles', 'master_roles', 'user_role_forest_accesses', 'planters'],
  'Reports & Jobs': ['reports', 'forests_reports', 'jobs', 'master_planting_reasons'],
};
const DOMAIN_OF = {};
for (const [d, ts] of Object.entries(DOMAINS)) for (const t of ts) DOMAIN_OF[t] = d;

const out = '/Users/mukesh/Claude/communitree-rebuild/docs/SCHEMA.html';
const json = JSON.stringify(S);
const domainsJson = JSON.stringify(DOMAINS);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CommuniTREE — Live Data Schema</title>
<style>
  :root{--ink:#16282e;--ink2:#0f1d22;--paper:#0d1518;--card:#13242a;--line:rgba(255,255,255,.1);--lime:#b6ff3c;--muted:#8aa0a3;--amber:#e8a33d;--fk:#5ec8ff}
  *{box-sizing:border-box}
  body{margin:0;font-family:'JetBrains Mono',ui-monospace,monospace;background:var(--paper);color:#dfe9e6;font-size:13px}
  header{position:sticky;top:0;z-index:10;background:var(--ink2);border-bottom:1px solid var(--line);padding:12px 18px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
  header h1{font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:16px;margin:0;color:#fff}
  header .meta{color:var(--muted);font-size:11px}
  input,label.tog{font:inherit}
  #q{background:var(--card);border:1px solid var(--line);color:#fff;border-radius:8px;padding:7px 12px;min-width:220px}
  .tog{color:var(--muted);display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px}
  .wrap{padding:16px 18px;max-width:1300px;margin:0 auto}
  .domain{margin:22px 0 8px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;color:var(--lime);letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid var(--line);padding-bottom:6px}
  .cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
  .card{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;transition:opacity .15s,box-shadow .15s,border-color .15s;cursor:pointer}
  .card.dim{opacity:.22}
  .card.active{border-color:var(--lime);box-shadow:0 0 0 1px var(--lime),0 0 22px rgba(182,255,60,.25)}
  .card.related{border-color:var(--fk)}
  .card h3{margin:0;padding:9px 12px;background:rgba(255,255,255,.04);font-family:'Plus Jakarta Sans',sans-serif;font-size:13.5px;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:8px}
  .rc{font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px}
  .rc.live{background:rgba(182,255,60,.15);color:var(--lime)} .rc.empty{background:rgba(255,255,255,.06);color:var(--muted)}
  ul{list-style:none;margin:0;padding:6px 0;max-height:260px;overflow:auto}
  li{padding:2px 12px;display:flex;gap:6px;align-items:baseline;white-space:nowrap}
  .cn{color:#dfe9e6} .ct{color:var(--muted);font-size:11px;margin-left:auto}
  .pk{color:var(--amber)} .fk{color:var(--fk)} .fkref{color:var(--fk);font-size:10.5px}
  .hint{color:var(--muted);font-size:11px;margin:4px 0 0}
  .legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:11px;margin-top:6px}
</style></head><body>
<header>
  <h1>🌳 CommuniTREE — Live Data Schema</h1>
  <span class="meta" id="counts"></span>
  <input id="q" placeholder="search table / column…" />
  <label class="tog"><input type="checkbox" id="legacy"/> show legacy/empty tables</label>
</header>
<div class="wrap">
  <div class="legend"><span><span class="pk">🔑</span> primary key</span><span><span class="fk">→</span> foreign key</span><span><span class="rc live">n</span> live rows</span><span><span class="rc empty">0</span> empty</span><span>click a table to highlight its relationships</span></div>
  <div id="root"></div>
</div>
<script>
const S=${json}, DOMAINS=${domainsJson};
const DOMAIN_OF={}; for(const d in DOMAINS) for(const t of DOMAINS[d]) DOMAIN_OF[t]=d;
const tables=[...new Set(S.cols.map(c=>c.table_name))];
const pk={}; S.pks.forEach(p=>{(pk[p.table_name]=pk[p.table_name]||new Set()).add(p.column_name)});
const fk={}; S.fks.forEach(f=>{(fk[f.table_name]=fk[f.table_name]||{})[f.column_name]={t:f.ref_table,c:f.ref_column}});
// relationship adjacency (both directions)
const rel={}; tables.forEach(t=>rel[t]=new Set());
S.fks.forEach(f=>{ rel[f.table_name]&&rel[f.table_name].add(f.ref_table); rel[f.ref_table]&&rel[f.ref_table].add(f.table_name); });
const colsOf={}; S.cols.forEach(c=>{(colsOf[c.table_name]=colsOf[c.table_name]||[]).push(c)});
const shortType=t=>({'character varying':'varchar','timestamp with time zone':'timestamptz','double precision':'float8','integer':'int','boolean':'bool'}[t]||t);

const order=[...Object.keys(DOMAINS),'Legacy / unused'];
function render(){
  const q=document.getElementById('q').value.trim().toLowerCase();
  const showLegacy=document.getElementById('legacy').checked;
  const root=document.getElementById('root'); root.innerHTML='';
  let shown=0;
  for(const dom of order){
    const list=tables.filter(t=>(DOMAIN_OF[t]||'Legacy / unused')===dom).sort();
    const cards=[];
    for(const t of list){
      const rc=S.rowcounts[t];
      const legacy=!DOMAIN_OF[t] && (!rc);
      if(legacy && !showLegacy) continue;
      const cols=colsOf[t]||[];
      const match=!q || t.toLowerCase().includes(q) || cols.some(c=>c.column_name.toLowerCase().includes(q));
      if(!match) continue;
      shown++;
      const lis=cols.map(c=>{
        const isPk=pk[t]&&pk[t].has(c.column_name);
        const ref=fk[t]&&fk[t][c.column_name];
        return '<li data-col="'+c.column_name.toLowerCase()+'"><span class="cn">'+(isPk?'<span class="pk">🔑</span> ':'')+(ref?'<span class="fk">→</span> ':'')+c.column_name+'</span>'+(ref?'<span class="fkref">'+ref.t+'</span>':'')+'<span class="ct">'+shortType(c.data_type)+(c.is_nullable==='NO'?'':'?')+'</span></li>';
      }).join('');
      const rcBadge='<span class="rc '+(rc?'live':'empty')+'">'+(rc==null?'?':rc.toLocaleString())+'</span>';
      cards.push('<div class="card" data-t="'+t+'"><h3>'+t+rcBadge+'</h3><ul>'+lis+'</ul></div>');
    }
    if(cards.length){ root.insertAdjacentHTML('beforeend','<div class="domain">'+dom+' <span style="color:var(--muted);font-weight:400">('+cards.length+')</span></div><div class="cards">'+cards.join('')+'</div>'); }
  }
  document.getElementById('counts').textContent=tables.length+' tables · '+S.cols.length+' columns · '+S.fks.length+' relationships';
  wire();
}
let activeT=null;
function wire(){
  document.querySelectorAll('.card').forEach(card=>{
    card.onclick=()=>{
      const t=card.dataset.t;
      if(activeT===t){activeT=null; clearHi(); return;}
      activeT=t; const related=rel[t]||new Set();
      document.querySelectorAll('.card').forEach(c=>{
        const ct=c.dataset.t; c.classList.remove('active','related','dim');
        if(ct===t)c.classList.add('active'); else if(related.has(ct))c.classList.add('related'); else c.classList.add('dim');
      });
    };
  });
}
function clearHi(){document.querySelectorAll('.card').forEach(c=>c.classList.remove('active','related','dim'));}
document.getElementById('q').addEventListener('input',()=>{activeT=null;render()});
document.getElementById('legacy').addEventListener('change',()=>{activeT=null;render()});
render();
</script></body></html>`;

fs.writeFileSync(out, html);
console.log('wrote', out, '(' + (html.length / 1024).toFixed(0) + ' KB)');
