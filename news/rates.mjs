// MyFinZen · tipos de interés de hipotecas.
// Lo ejecuta la misma tarea horaria que las noticias (.github/workflows/noticias.yml) y publica rates.json en la rama `news`.
// Fuentes públicas y gratuitas a través de FRED (Banco de la Reserva Federal de St. Louis):
//  - Optimal Blue Mortgage Market Indices (OBMMI): media diaria de los tipos bloqueados de verdad, por producto, FICO y LTV.
//  - Freddie Mac Primary Mortgage Market Survey (PMMS): media semanal de EE. UU. a 30 y 15 años.
// Son índices nacionales: en California los tipos van muy parejos; lo que cambia es el límite del préstamo (conforme / jumbo).
// No conoce ni recibe nada del usuario. Uso: node news/rates.mjs <salida.json> [anterior.json]
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const UA = 'Mozilla/5.0 (compatible; MyFinZen-rates/1.0; +https://github.com/Marcos86GO/MyFinZen)';
const FICO = ['GE740', 'B720A739', 'B700A719', 'B680A699', 'LT680'];
export const SERIES = [
  'OBMMIC30YF', 'OBMMIC15YF', 'OBMMIJUMBO30YF', 'OBMMIFHA30YF', 'OBMMIVA30YF', 'MORTGAGE30US', 'MORTGAGE15US',
  ...FICO.map(f => 'OBMMIC30YFLVLE80F' + f), ...FICO.map(f => 'OBMMIC30YFLVGT80F' + f)];
const HIST = new Set(['OBMMIC30YF', 'MORTGAGE30US']); // con historial de un año para el gráfico
const REFRESH_H = 3; // FRED se actualiza una vez al día: basta con mirar cada pocas horas

// CSV de FRED: "observation_date,SERIE" (o "DATE,SERIE") y una fila por fecha; "." = sin dato
export function parseFredCSV(txt) {
  const out = [];
  for (const line of String(txt).trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(',');
    const n = Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v !== '.' && Number.isFinite(n) && n > 0 && n < 30) out.push([d, n]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}
// Último dato, el de hace ~4 semanas y (para algunas) un punto por semana durante el último año
export function summarize(rows, withHist) {
  if (!rows.length) return null;
  const [d, v] = rows[rows.length - 1];
  const t = Date.parse(d) - 28 * 864e5;
  let ago = null; for (const r of rows) if (Date.parse(r[0]) <= t) ago = r; // el último dato hasta hace 4 semanas
  const o = { d, v };
  if (ago) { o.ad = ago[0]; o.a = ago[1]; }
  if (withHist) {
    const from = Date.parse(d) - 366 * 864e5; const h = []; let lastW = '';
    for (const [rd, rv] of rows) { if (Date.parse(rd) < from) continue; const w = Math.floor(Date.parse(rd) / (7 * 864e5)); if (String(w) === lastW) h[h.length - 1] = [rd, rv]; else { h.push([rd, rv]); lastW = String(w); } }
    o.h = h;
  }
  return o;
}
async function get(url, timeoutMs = 20000) {
  const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { 'user-agent': UA, accept: 'text/csv,*/*;q=0.5' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(tm); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [outPath = 'rates.json', prevPath] = process.argv.slice(2);
  let prev = {}; if (prevPath) { try { prev = JSON.parse(await fs.readFile(prevPath, 'utf8')); } catch { prev = {}; } }
  const now = Date.now();
  await fs.mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  const fresh = prev.v === 1 && prev.checked && now - Date.parse(prev.checked) < REFRESH_H * 3600e3 && Object.keys(prev.series || {}).length;
  if (fresh) { await fs.writeFile(outPath, JSON.stringify(prev)); console.log('Tipos: sin cambios (comprobados hace menos de ' + REFRESH_H + ' h)'); return; }
  const start = new Date(now - 400 * 864e5).toISOString().slice(0, 10);
  const series = {}; const status = [];
  for (const id of SERIES) {
    try {
      const rows = parseFredCSV(await get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${start}`));
      const s = summarize(rows, HIST.has(id));
      if (s) series[id] = s; status.push({ id, ok: !!s, ...(s ? { d: s.d } : { err: 'sin datos' }) });
    } catch (e) { status.push({ id, ok: false, err: String(e.message || e).slice(0, 80) }); }
    await sleep(400);
  }
  const ok = status.filter(s => s.ok).length;
  for (const s of status) console.log(`${s.ok ? '✓' : '✗'} ${s.id.padEnd(26)} ${s.d || s.err}`);
  if (!ok) { // si FRED no responde, se conserva lo anterior (la app enseña su fecha)
    console.log('Tipos: ninguna serie respondió; se conserva la versión anterior');
    await fs.writeFile(outPath, JSON.stringify(prev && prev.v === 1 ? prev : { v: 1, updated: null, checked: null, series: {}, status }));
    return;
  }
  const out = { v: 1, updated: new Date(now).toISOString(), checked: new Date(now).toISOString(), source: 'FRED: Optimal Blue Mortgage Market Indices y Freddie Mac PMMS', series: { ...(prev.series || {}), ...series }, status };
  await fs.writeFile(outPath, JSON.stringify(out));
  console.log(`Tipos: ${ok}/${SERIES.length} series`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch(e => { console.error(e); process.exitCode = 0; });
