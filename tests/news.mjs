// Pruebas del recolector de noticias (sin red): lectura de RSS/Atom, filtro de pago, unión y recorte.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseFeed, normalize, merge, trim, isPaywalled, gnURL, tickerQuery, clean } from '../news/build.mjs';

const SRC = JSON.parse(fs.readFileSync(new URL('../news/sources.json', import.meta.url)));
const UNI = JSON.parse(fs.readFileSync(new URL('../news/universe.json', import.meta.url)));
const now = Date.parse('2026-10-31T20:00:00Z');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('✓ ' + name); };

const rss = `<?xml version="1.0"?><rss><channel><title>X</title>
<item><title><![CDATA[Stocks rally as <b>Fed</b> signals pause &amp; yields fall]]></title><link>https://www.cnbc.com/2026/10/31/stocks.html</link><pubDate>Sat, 31 Oct 2026 18:00:00 GMT</pubDate></item>
<item><title>Old story about something from last week</title><link>https://www.cnbc.com/2026/10/20/old.html</link><pubDate>Tue, 20 Oct 2026 18:00:00 GMT</pubDate></item>
</channel></rss>`;
const gn = `<rss><channel>
<item><title>Ibex 35 cierra en máximos del año - elEconomista.es</title><link>https://news.google.com/rss/articles/CBMiAAA?oc=5</link><pubDate>Sat, 31 Oct 2026 17:00:00 GMT</pubDate><source url="https://www.eleconomista.es">elEconomista.es</source></item>
<item><title>Las bolsas europeas suben con fuerza hoy - Expansión</title><link>https://news.google.com/rss/articles/CBMiBBB?oc=5</link><pubDate>Sat, 31 Oct 2026 16:00:00 GMT</pubDate><source url="https://www.expansion.com">Expansión</source></item>
<item><title>Stocks rally as Fed signals pause and yields fall - CNBC</title><link>https://news.google.com/rss/articles/CBMiCCC?oc=5</link><pubDate>Sat, 31 Oct 2026 18:05:00 GMT</pubDate><source url="https://www.cnbc.com">CNBC</source></item>
</channel></rss>`;
const atom = `<feed><entry><title type="html">ECB holds rates steady, Lagarde says</title><link rel="alternate" href="https://www.dw.com/en/ecb/a-1"/><updated>2026-10-31T15:00:00Z</updated></entry></feed>`;

t('lee RSS con CDATA, HTML y entidades', () => {
  const r = parseFeed(rss); assert.equal(r.length, 2); assert.equal(r[0].title, 'Stocks rally as Fed signals pause & yields fall'); assert.equal(r[0].link, 'https://www.cnbc.com/2026/10/31/stocks.html');
});
t('lee Atom (enlace en href)', () => { const r = parseFeed(atom); assert.equal(r[0].link, 'https://www.dw.com/en/ecb/a-1'); assert.equal(r[0].title, 'ECB holds rates steady, Lagarde says'); });
t('Google News: quita " - Fuente", usa el dominio del medio y descarta los de pago', () => {
  const r = normalize(parseFeed(gn), {}, SRC.paywall, now);
  assert.equal(r.length, 2); assert.equal(r[0].t, 'Ibex 35 cierra en máximos del año'); assert.equal(r[0].d, 'eleconomista.es'); assert.equal(r[0].s, 'elEconomista.es');
  assert.ok(!r.some(x => /Expansi/.test(x.s)));
});
t('filtro de pago por dominio y por ruta', () => {
  assert.ok(isPaywalled(['https://www.wsj.com/a'], SRC.paywall)); assert.ok(isPaywalled(['https://markets.ft.com/x'], SRC.paywall));
  assert.ok(isPaywalled(['https://www.cnbc.com/pro/x'], SRC.paywall)); assert.ok(!isPaywalled(['https://www.cnbc.com/2026/x'], SRC.paywall));
  assert.ok(!isPaywalled(['https://www.bbc.com/news'], SRC.paywall));
});
t('une duplicados entre fuentes y prefiere el enlace directo al medio', () => {
  const a = normalize(parseFeed(rss), { source: 'CNBC' }, SRC.paywall, now).map(x => ({ ...x, r: ['us'] }));
  const b = normalize(parseFeed(gn), {}, SRC.paywall, now).map(x => ({ ...x, r: ['global'], k: ['SPY'] }));
  const m = merge([b, a]); const s = m.find(x => /Stocks rally/.test(x.t));
  assert.equal(s.u, 'https://www.cnbc.com/2026/10/31/stocks.html'); assert.deepEqual(s.r.sort(), ['global', 'us']); assert.deepEqual(s.k, ['SPY']);
});
t('recorta por antigüedad y cantidad', () => {
  const a = normalize(parseFeed(rss), { source: 'CNBC' }, SRC.paywall, now).map(x => ({ ...x, r: ['us'], k: [] }));
  const out = trim(a, SRC.regions, now); assert.equal(out.length, 1); assert.ok(!('k' in out[0]));
});
t('URLs de búsqueda por edición y por símbolo', () => {
  const u = gnURL({ ed: 'ES', q: 'Ibex' }, SRC.editions); assert.ok(u.includes('hl=es&gl=ES&ceid=ES%3Aes') && u.includes('Ibex%20when%3A1d'));
  assert.equal(tickerQuery({ s: 'VOO', t: 'etf' }).q, '"VOO" ETF'); assert.equal(tickerQuery({ s: 'GOOGL', t: 'stock', n: 'Alphabet', a: ['Google', 'Alphabet'] }).q, '("Google" OR "Alphabet") (stock OR shares OR earnings)');
});
t('configuración coherente', () => {
  const ids = new Set(SRC.regions.map(r => r.id)); assert.ok(SRC.feeds.every(f => ids.has(f.region) && (f.url || (f.gn && SRC.editions[f.gn.ed]))));
  assert.ok(SRC.regions.every(r => SRC.feeds.some(f => f.region === r.id)), 'cada región tiene al menos una fuente');
  assert.equal(new Set(UNI.map(u => u.s)).size, UNI.length); assert.ok(UNI.length > 150);
  assert.equal(clean('a &amp;amp; b'), 'a & b');
});
t('allow limita una búsqueda a medios del país y skip descarta agregadores', () => {
  const es = SRC.feeds.find(f => f.id === 'gn-es'); assert.ok(es.allow);
  const xml = `<rss><channel><item><title>El Ibex sube con la banca en la sesión - Bolsamanía</title><link>https://news.google.com/rss/articles/A</link><pubDate>Sat, 31 Oct 2026 17:00:00 GMT</pubDate><source url="https://www.bolsamania.com">Bolsamanía</source></item>
<item><title>Tierra del Fuego impulsa nuevos mercados con Brasil - Aire Libre</title><link>https://news.google.com/rss/articles/B</link><pubDate>Sat, 31 Oct 2026 17:00:00 GMT</pubDate><source url="https://airelibre.com.ar">Aire Libre</source></item>
<item><title>Las bolsas abren en verde según Cinco Noticias - 20minutos</title><link>https://news.google.com/rss/articles/C</link><pubDate>Sat, 31 Oct 2026 17:00:00 GMT</pubDate><source url="https://www.20minutos.es">20minutos</source></item></channel></rss>`;
  const r = normalize(parseFeed(xml), es, [...SRC.paywall, ...SRC.skip], now); assert.deepEqual(r.map(x => x.d), ['bolsamania.com', '20minutos.es']);
  assert.ok(isPaywalled(['https://www.moomoo.com/x'], SRC.skip)); assert.ok(isPaywalled(['https://www.theglobeandmail.com/x'], SRC.paywall));
});
console.log(`\n${n} pruebas de noticias OK`);
