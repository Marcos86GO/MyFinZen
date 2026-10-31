# MyFinZen — guía para Claude

App web instalable (PWA) de finanzas personales para un único usuario, con todos los datos **cifrados en el dispositivo**. Sin servidor, sin build, sin framework. Publicada con GitHub Pages desde `main` (raíz).

> **El repositorio es PÚBLICO.** Nunca subas datos reales del usuario: ni extractos, ni importes, ni nombres, ni direcciones, ni números de cuenta. Las pruebas usan solo datos inventados (`tests/make-fixtures.py`).

## Idioma y estilo

- Interfaz, textos, comentarios y mensajes de commit en **español**. Los nombres de los menús de TurboTax, en inglés, como aparecen en TurboTax.
- El usuario vive en California (EE. UU.) y declara casado conjuntamente (MFJ). Las reglas fiscales son federales y de California.
- Importes en USD (`fmt()`), fechas en formato ISO internamente y `dLabel()` para mostrarlas.

## Arquitectura

Todo vive en `index.html` (≈1.700 líneas: HTML, CSS y un único `<script>`). Secciones en orden:

| Zona | Qué contiene |
|---|---|
| Storage | `KINDS` (tipos de cuenta), `CATS` (categorías), `DEFAULT_RULES` (auto-categorización por regex), `blankState()`, `IDB` (IndexedDB clave-valor), `save()` → `persist()` con retardo |
| Utilidades | `fmt`, `num` (parsea importes US/EU y negativos entre paréntesis), `parseDate`, `uid`, `esc` |
| Dominio | `lastSnap`/`balanceOf` (saldos por fecha), `netWorthAt`, `cashflowByMonth`, `amortize` (hipoteca mes a mes), `categorize` |
| Gráficos | SVG hechos a mano: `lineChart`, `barChart`, `hbars`, `legend`, con tooltips. Paleta en variables CSS `--s1..--s8` (modo claro/oscuro) |
| Avisos | `computeAlerts()` |
| Vistas | `VIEWS.<nombre>(el)` + `route()` por hash: `resumen`, `flujo`, `hipotecas`, `inversiones`, `alquiler`, `cuentas`, `importar`, `impuestos`, `claude`, `ajustes` |
| Importar | CSV de banco/tarjeta (`handleCSV`, detección de columnas y signo), CSV de Holdings (`isHoldingsCSV`, `parseHoldings`), PDF (`pdfText` con pdf.js → `parseStatement` → hipoteca / genérico con `parseTxLines` / fiscal con `detectTaxForm` + `localTaxFields`). Cola de PDFs: `queuePDF`/`pdfDone` |
| Claude en PDFs | `redact()` (oculta cuentas, SSN, EIN, teléfonos, emails, direcciones y nombres de `settings.hideNames`) → `claudeExtract()` (JSON estructurado). Siempre pide confirmación salvo que `settings.autoClaude` esté activo |
| Impuestos | `TAXC` (tramos, deducción estándar, SALT, LTCG, CTC por año y estado civil), `CA_STD`, `computeTaxes(year, adj)`, `rentalSchedule` (Schedule E), `expectedDocs` |
| Optimizador | `LIM` (401k, IRA, HSA, DCFSA y límites de ingresos por año), `CA_BR`, perfil familiar `prof(year)`, `recommendations(year)` (ahorro estimado con `savingsOf` = what-if de `computeTaxes`), `taxTurbo` (guía TurboTax con las cifras del usuario) |
| Ajustes | Copia cifrada (`encryptState`/`decryptBackup`, formato `{app:'misfinanzas',v:1,salt,iv,data}`, compatible con la versión antigua), seguridad, clave de API |
| Bóveda | Ver "Seguridad". `createVault`, `unlockWith{Password,Passkey,Recovery}`, `addPasskey`, `lockNow`, `showGate(mode)` |
| Claude | `claudeCall(prompt,{modelTier,onText,stream,maxTokens})` → API de Anthropic con la clave del usuario. `getSample()` devuelve una función compatible con la interfaz antigua (`f(prompt,opts)` y `f.json(prompt)`). Modelos en `MODELS` |
| Boot | Abre IndexedDB, muestra `setup` o `unlock`, registra `sw.js` y la barra de "versión nueva" |

Estado global: `S` (objeto del usuario, `null` cuando está bloqueado). Forma: `{v, accounts[], snapshots[], tx[], rules[], settings{}, tax{[año]:{filing,kids,docs[],profile{},rental{},ttDone{}}}, holdingsHist[], secret{apiKey}}`. Cuentas de tipo `mortgage` llevan `rate`, `payment` (capital+intereses), `extra`, `escrow`, `propertyId`, `pre2017`. Las de tipo `property` llevan `rental`, `rent`, `hoa`, `taxYear`, `insYear`, `maint`, `buildingBasis`, `inService`. Las de inversión pueden llevar `holdings{date,rows[]}` y `contributed`.

## Seguridad (no romper)

- Los datos se cifran con una clave aleatoria **DK** (AES-GCM 256). `VAULT.meta` guarda la DK envuelta por cada método:
  - `pw`: PBKDF2-SHA256, 600.000 iteraciones.
  - `rec`: clave de recuperación de 24 caracteres, PBKDF2 con 200.000 iteraciones.
  - `pk[]`: passkeys WebAuthn con extensión **PRF** → HKDF → clave de envoltura. `rpId = location.hostname`.
- En IndexedDB solo se guarda `vault` (cifrado). Nada en claro, nunca. `persist()` vuelve a cifrar `S` completo.
- Bloqueo: `lockNow()` borra `S` y la DK de la memoria. Hay bloqueo automático por inactividad (`settings.lockMin`) y al volver de segundo plano.
- La clave de API vive en `S.secret` y se excluye de las copias (`encryptState`).
- CSP en `<meta>`: solo `'self'` y `https://api.anthropic.com`. Si añades un servicio (por ejemplo Dropbox), amplía `connect-src` solo con sus dominios exactos.
- No añadas analítica, CDNs ni dependencias remotas. pdf.js está copiado en `vendor/`.

## Probar

```bash
npm i && npx playwright install chromium
npm run fixtures   # genera PDFs/CSVs inventados en tests/fixtures
npm test           # 21 pruebas end-to-end (passkey con autenticador virtual PRF, API de Claude simulada)
```

Antes de cada commit, pasa `npm test`. Para cambios visuales, haz capturas con Playwright en móvil (412×900) y en escritorio (1200×900) y revísalas.

## Publicar

1. Commit en `main` → GitHub Pages publica en 1–2 minutos (`https://marcos86go.github.io/MyFinZen/`).
2. **Sube `VERSION` en `sw.js`** en cada cambio de la app. Si no, los dispositivos instalados siguen con la versión cacheada. Al detectar la versión nueva, la app muestra "Hay una versión nueva → Actualizar".
3. Si añades archivos que deban funcionar sin conexión, inclúyelos en `ASSETS` de `sw.js`.

## Mantenimiento anual

Cada otoño, cuando el IRS publique los ajustes del año siguiente, actualiza en `index.html`:
- `TAXC[año]`: tramos, deducción estándar, umbrales LTCG, tope y umbral SALT, CTC.
- `LIM[año]`: 401(k), IRA, HSA, DCFSA y rangos de deducción de la IRA y de la Roth.
- `CA_STD` y `CA_BR` (FTB de California).
- El selector de años de `VIEWS.impuestos` toma los años de `TAXC`/`S.tax`.

Comprueba las cifras en fuentes oficiales (irs.gov, ftb.ca.gov) antes de cambiarlas.

## Pendiente / ideas

- **Sincronización con Dropbox**: OAuth PKCE en el navegador (app de Dropbox con permiso "App folder"), subir y bajar `vault` (ya está cifrado) a `/Apps/MyFinZen/vault.json`, resolución de conflictos por `meta.updated`. Hace falta el *App key* del usuario y añadir `https://api.dropboxapi.com https://content.dropboxapi.com https://www.dropbox.com` a la CSP.
- Estimación del impuesto de California (ahora solo compara deducción detallada y estándar, y el tipo marginal).
- Lectores locales específicos para extractos de Chase, Amex, BofA y M1 (ahora: heurística genérica + Claude opcional).
- Historial de posiciones (`S.holdingsHist`) → gráfico de evolución por activo.
- Dividir `index.html` en módulos si supera ~2.500 líneas.
- Si algún día se comercializa: revisar licencia, el contrato laboral del autor (California Labor Code 2870) y valorar repo privado.
