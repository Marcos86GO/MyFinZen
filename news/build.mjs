// MyFinZen · recolector de noticias.
// Lo ejecuta GitHub Actions cada hora (.github/workflows/noticias.yml) y publica news.json en la rama `news`.
// Solo usa fuentes públicas y gratuitas (news/sources.json) y una lista pública de símbolos (news/universe.json).
// No conoce ni recibe nada del usuario: la app filtra en el dispositivo las noticias de sus posiciones.
// Uso: node news/build.mjs <salida.json> [anterior.json]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const H = 3600e3;
const FORMAT = 3; // súbelo si cambian los filtros para descartar lo acumulado
const UA = 'Mozilla/5.0 (compatible; MyFinZen-news/1.0; +https://github.com/Marcos86GO/MyFinZen)';
export const LIMITS = { regionHours: 72, regionMax: 100, countryMax: 50, tickerDays: 10, tickerMax: 6, rotation: 4, tickerDelayMs: Number(process.env.NEWS_DELAY_MS ?? 1500) };

/* ---------- XML / RSS ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', euro: '€' };
export function entities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
export function clean(s) {
  if (s == null) return '';
  let t = String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  t = entities(t); // a veces el HTML viene escapado dentro del título
  t = t.replace(/<[^>]*>/g, ' ');
  t = entities(t);
  return t.replace(/\s+/g, ' ').trim();
}
function tag(x, name) {
  const m = x.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : null;
}
export function parseFeed(xml) {
  const out = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const b of blocks) {
    const title = clean(tag(b, 'title'));
    let link = clean(tag(b, 'link'));
    if (!/^https?:\/\//i.test(link)) { const m = b.match(/<link[^>]*href=["']([^"']+)["']/i); link = m ? entities(m[1]) : ''; }
    if (!/^https?:\/\//i.test(link)) { const g = clean(tag(b, 'guid')); if (/^https?:\/\//i.test(g)) link = g; }
    const date = clean(tag(b, 'pubDate') || tag(b, 'dc:date') || tag(b, 'published') || tag(b, 'updated'));
    const sm = b.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    out.push({ title, link, date, source: sm ? clean(sm[2]) : '', sourceUrl: sm ? entities(sm[1]) : '' });
  }
  return out;
}

/* ---------- Normalización ---------- */
export function host(u) { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
export function isPaywalled(urls, list) {
  for (const u of urls) {
    if (!u) continue;
    let h, p; try { const x = new URL(u); h = x.hostname.replace(/^www\./, '').toLowerCase(); p = x.pathname; } catch { continue; }
    for (const e of list) {
      const i = e.indexOf('/');
      const d = i < 0 ? e : e.slice(0, i), pre = i < 0 ? '' : e.slice(i);
      if ((h === d || h.endsWith('.' + d)) && (!pre || p.startsWith(pre))) return true;
    }
  }
  return false;
}
export function titleKey(t) {
  return t.toLowerCase().replace(/&/g, ' and ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').slice(0, 14).join(' ');
}
export function normalize(raw, feed, list, now = Date.now()) {
  const items = [];
  for (const r of raw) {
    if (!r.title || !/^https?:\/\//i.test(r.link)) continue;
    const isGN = host(r.link) === 'news.google.com';
    let source = r.source || feed.source || '';
    let t = r.title;
    if (isGN && source && t.endsWith(' - ' + source)) t = t.slice(0, -(source.length + 3)).trim();
    const d = isGN ? host(r.sourceUrl) : host(r.link);
    if (!source) source = d;
    if (isPaywalled([r.link, r.sourceUrl], list)) continue;
    if (feed.allow && !isPaywalled([isGN ? r.sourceUrl : r.link], feed.allow.map(a => a.replace(/^\./, '')))) continue; // fuera de los dominios permitidos
    let p = Date.parse(r.date); if (!Number.isFinite(p)) p = now; if (p > now + H) p = now;
    if (t.length < 12) continue;
    items.push({ t, u: r.link, s: source, d, p: new Date(p).toISOString() });
  }
  return items;
}

/* ---------- Descarga ---------- */
export function gnURL(gn, editions, when = '1d') { // when: 1d, 2d, 7d…
  const e = editions[gn.ed || 'US'];
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${gn.q} when:${when}`)}&hl=${e.hl}&gl=${e.gl}&ceid=${encodeURIComponent(e.ceid)}`;
}
async function get(url, timeoutMs = 20000) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5' } });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return await r.text();
  } finally { clearTimeout(tm); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
export function tickerQuery(u) {
  if (u.t === 'etf') return { ed: 'US', q: `"${u.s}" ETF` };
  const names = (u.a && u.a.length ? u.a : [u.n]).map(x => `"${x}"`);
  return { ed: 'US', q: `(${names.join(' OR ')}) (stock OR shares OR earnings)` };
}

/* ---------- Unión y recorte ---------- */
export function merge(lists) {
  const byKey = new Map();
  for (const it of lists.flat()) {
    const k = titleKey(it.t); if (!k) continue;
    const ex = byKey.get(k);
    if (!ex) { byKey.set(k, { ...it, r: [...(it.r || [])], k: [...(it.k || [])] }); continue; }
    for (const x of it.r || []) if (!ex.r.includes(x)) ex.r.push(x);
    for (const x of it.k || []) if (!ex.k.includes(x)) ex.k.push(x);
    if (host(ex.u) === 'news.google.com' && host(it.u) !== 'news.google.com') { ex.u = it.u; ex.s = it.s; ex.d = it.d; } // mejor el enlace directo al medio
    if (it.p < ex.p) ex.p = it.p;
  }
  return [...byKey.values()];
}
export function trim(items, regions, now = Date.now(), L = LIMITS) {
  const country = new Set(regions.filter(r => r.country).map(r => r.id));
  const sorted = items.slice().sort((a, b) => b.p.localeCompare(a.p));
  const keepR = new Map(), keepK = new Map();
  for (const it of sorted) {
    const age = now - Date.parse(it.p);
    it.r = it.r.filter(r => { if (age > L.regionHours * H) return false; const n = keepR.get(r) || 0; const max = country.has(r) ? L.countryMax : L.regionMax; if (n >= max) return false; keepR.set(r, n + 1); return true; });
    it.k = it.k.filter(k => { if (age > L.tickerDays * 24 * H) return false; const n = keepK.get(k) || 0; if (n >= L.tickerMax) return false; keepK.set(k, n + 1); return true; });
  }
  return sorted.filter(it => it.r.length || it.k.length).map(it => { const o = { t: it.t, u: it.u, s: it.s, d: it.d, p: it.p }; if (it.r.length) o.r = it.r; if (it.k.length) o.k = it.k; return o; });
}

/* ---------- Programa ---------- */
async function main() {
  const [outPath = 'news.json', prevPath] = process.argv.slice(2);
  const SRC = JSON.parse(await fs.readFile(path.join(HERE, 'sources.json'), 'utf8'));
  const UNI = JSON.parse(await fs.readFile(path.join(HERE, 'universe.json'), 'utf8'));
  let prev = {}; if (prevPath) { try { prev = JSON.parse(await fs.readFile(prevPath, 'utf8')); } catch { prev = {}; } }
  if (prev.v !== FORMAT) prev = {}; // al cambiar filtros o formato se empieza de cero
  const BLOCK = [...SRC.paywall, ...(SRC.skip || [])];
  const now = Date.now();
  const status = []; const got = [];

  // 1) Titulares por región (en paralelo, de 6 en 6)
  const queue = SRC.feeds.slice();
  async function worker() {
    while (queue.length) {
      const f = queue.shift(); const t0 = Date.now();
      const url = f.gn ? gnURL(f.gn, SRC.editions, f.gn.when || '1d') : f.url;
      try {
        const items = normalize(parseFeed(await get(url)), f, BLOCK, now).map(x => ({ ...x, r: [f.region] }));
        got.push(items); status.push({ id: f.id, region: f.region, ok: items.length > 0, n: items.length, ms: Date.now() - t0, ...(items.length ? {} : { err: 'sin titulares' }) });
      } catch (e) { status.push({ id: f.id, region: f.region, ok: false, n: 0, ms: Date.now() - t0, err: String(e.message || e).slice(0, 120) }); }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));

  // 2) Noticias por símbolo: una cuarta parte del universo en cada ejecución (todo en la primera)
  const slot = Math.floor(now / H) % LIMITS.rotation;
  const first = !(prev.items && prev.items.length);
  const todo = UNI.filter((u, i) => first || i % LIMITS.rotation === slot);
  let tOk = 0, tFail = 0, stopped = '';
  for (const u of todo) {
    try {
      const items = normalize(parseFeed(await get(gnURL(tickerQuery(u), SRC.editions, '7d'))), {}, BLOCK, now).map(x => ({ ...x, k: [u.s] }));
      got.push(items); tOk++;
    } catch (e) {
      tFail++;
      if (e.status === 429 || e.status === 503) { stopped = 'Google News pidió esperar (HTTP ' + e.status + ')'; break; }
    }
    await sleep(LIMITS.tickerDelayMs);
  }

  // 3) Unir con lo anterior, quitar duplicados y recortar
  const regions = SRC.regions;
  const prevItems = (prev.items || []).filter(x => !isPaywalled(['https://' + x.d + '/'], BLOCK)).map(x => ({ ...x, r: x.r || [], k: x.k || [] }));
  const items = trim(merge([prevItems, ...got]), regions, now);
  const out = {
    v: FORMAT, updated: new Date(now).toISOString(), regions,
    universe: UNI.map(u => ({ s: u.s, n: u.n, ...(u.a ? { a: u.a } : {}) })),
    feeds: status.sort((a, b) => a.id.localeCompare(b.id)),
    tickers: { queried: todo.length, ok: tOk, failed: tFail, ...(stopped ? { stopped } : {}) },
    items
  };
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(out));
  const okF = status.filter(s => s.ok).length;
  console.log(`Fuentes: ${okF}/${status.length} con titulares · símbolos: ${tOk}/${todo.length}${stopped ? ' · ' + stopped : ''} · ${items.length} noticias`);
  for (const s of out.feeds) console.log(`${s.ok ? '✓' : '✗'} ${s.id.padEnd(24)} ${String(s.n).padStart(3)} ${s.err || ''}`);
  if (!okF) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error(e); process.exit(1); });
