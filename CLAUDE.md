# MyFinZen — guía para Claude

App web instalable (PWA) de finanzas personales para un único usuario, con todos los datos **cifrados en el dispositivo**. Sin servidor, sin build, sin framework. Publicada con GitHub Pages desde `main` (raíz).

> **El repositorio es PÚBLICO.** Nunca subas datos reales del usuario: ni extractos, ni importes, ni nombres, ni direcciones, ni números de cuenta. Las pruebas usan solo datos inventados (`tests/make-fixtures.py`).

## Idioma y estilo

- La app es **bilingüe (español / inglés)**. Todo texto visible pasa por `L('español','English')`; nunca escribas un texto de interfaz sin su versión inglesa. Para objetos con etiquetas usa `bil({...})` o getters (como `KINDS`, `FORM_LABEL`, `FORM_FIELDS`). El idioma está en `LANG`, se cambia con `setLang()` y se guarda en `localStorage` (`mfz-lang`; no es un dato personal). Quien ya tenía bóveda y no ha elegido idioma sigue en español.
- Los nombres internos de las categorías de sistema están en español (son los que se guardan); se muestran con `catL()` (`CAT_EN`). Las clases de activo, con `acL()`. Meses: `mesAbbr`/`mesLong`.
- Comentarios y mensajes de commit en **español**. Los nombres de los menús de TurboTax, en inglés, como aparecen en TurboTax.
- El usuario vive en California (EE. UU.) y declara casado conjuntamente (MFJ). Las reglas fiscales son federales y de California.
- Importes en USD (`fmt()`), fechas en formato ISO internamente y `dLabel()` para mostrarlas.

## Arquitectura

`index.html` lleva el HTML y el CSS; todo el código está en `app.js` (≈1.950 líneas; fuera del HTML para que la CSP prohíba scripts incrustados) y los textos de ayuda y el manual, en `help.js`. Secciones de `app.js` en orden:

| Zona | Qué contiene |
|---|---|
| Validación | `sanitizeState()` (al desbloquear y al restaurar: listas, números con `numStrict`, fechas con `isoDate`, ids con `cleanId`), `sanitizeExtract()` (respuesta de Claude al leer un PDF) y `sanitizeNews()` (news.json). **Todo dato externo pasa por un validador antes de usarse** |
| Storage | `KINDS` (tipos de cuenta), `CATS` (categorías), `CAT_WORDS` (auto-categorización: palabras completas sobre `normDesc()`, que quita el nombre del titular `INDN:`, ids, fechas, números largos y `settings.hideNames`; gana la palabra más larga + bonus; las de ingreso solo con importe positivo; `S.rules` son solo las reglas del usuario y van primero; si no casa nada → `otherCat()` y el movimiento queda "sin categoría" (`isUncat`) con aviso. `migrateCats()` quita las reglas antiguas de `S.rules` y recategoriza lo automático, `settings.catVer=2`), `blankState()`, `IDB` (IndexedDB clave-valor), `save()` → `persist()` con retardo |
| Utilidades | `fmt`, `num` (parsea importes US/EU y negativos entre paréntesis), `parseDate`, `uid`, `esc` |
| Dominio | `lastSnap`/`balanceOf` (saldos por fecha), `netWorthAt`, `cashflowByMonth`, `amortize` (hipoteca mes a mes), `categorize` |
| Conciliación | `reconcile()` (se ejecuta en cada `route()`): empareja pagos de tarjeta y transferencias entre cuentas propias (mismo importe, ±días) y cuotas de hipoteca pagadas desde el banco (importe exacto de cuota+escrow+extra o nombre de la entidad); marca `t.rec` y ajusta la categoría salvo `t.manual`. Comprueba pagos a tarjetas no importadas, cuotas que faltan o no coinciden, saldo de la hipoteca entre extractos, saldo vs. movimientos en bancos y tarjetas, y duplicados CSV/PDF. Resultado en `REC` (`recHTML`, `wireRec`); lo ignorado va a `settings.recIgnore`. Las hipotecas cuentan en `cashflowByMonth` como cuota fija mensual (`fixedMortgages`, `mortMonthly`) |
| Ayuda y manual | `help.js` (fuera de `index.html`): `HELP[clave]={es,en}` con título, párrafos y pasos; `HELP_GROUPS` (orden por pantalla) y `MANUAL` (capítulos generales). En `index.html`: `helpBtn(clave)` pinta el icono (i) arriba a la derecha de la tarjeta, `showHelp()` abre el tutorial y `VIEWS.ayuda` monta el manual. **Cada tarjeta nueva lleva su `helpBtn` y su texto en `help.js` en los dos idiomas** (la prueba lo comprueba) |
| Categorías propias | `S.settings.userCats=[{name,type}]`; `catsOf(tipo)`, `allCats()`, `catType()`, `catOptions(sel)` (con la opción "+ Nueva categoría…"), `newCatModal()`, `manageCats()`. Las de sistema (`CATS`) no se borran |
| Gráficos | SVG hechos a mano: `lineChart`, `barChart`, `hbars`, `legend`, con tooltips. Paleta en variables CSS `--s1..--s8` (modo claro/oscuro) |
| Avisos | `computeAlerts()`: cada aviso lleva `key` (con fecha o cantidad para que vuelva si la situación cambia) y `go` (`{h, month?, cat?, el?, acc?}`). `alertsHTML` + `wireAlerts`: tocar → `goAlert()` (abre la pantalla con el filtro, la ficha o el bloque); × → `settings.alertIgnore`; "Volver a mostrar" |
| Interfaz | Menú lateral (`#drawer`, `NAV` en el orden Resumen, Movimientos, Cuentas, Inversiones, Hipotecas, Impuestos; `NAV_MORE` dentro de "Más": Alquiler, Claude, Manual, Ajustes; `NAV_PARENT` para las pestañas hijas). En el móvil se abre con ☰ (`menuOpen`); desde 1000 px está siempre visible. Título de la sección en `#pageTitle` (`navLabel`). Botón `+` (`#fab`, solo en `FAB_VIEWS`): importar o `addTxModal()`. Iconos SVG propios en `ICONS` → `ic(nombre)`. Listas tipo app de banco (`.lrow`, avatares `accAv`/`catAv`) y fichas en ventana: `accountSheet(id)` (Importar, Actualizar saldo, Editar, Historial) y `txSheet(id)` (categoría y borrar). Resumen: cifra principal con gráfico (`lineChart` con `area`), 4 tarjetas, avisos plegados (`alertsBox`) y primeros pasos (`onboardHTML`, `settings.onboardDone`). Estilos en variables CSS de `index.html` (claro/oscuro) |
| Vistas | `VIEWS.<nombre>(el)` + `route()` por hash: `resumen`, `flujo` (Movimientos: gasto por categoría con el resumen del mes, ingresos/gastos/ahorro, conciliación y la lista por día; filtro `__none` = sin categoría; `flujoFilter.sort` ordena por fecha o importe, `TX_SORTS`; por importe la lista no se agrupa por día y cada fila lleva su fecha), `hipotecas`, `inversiones`, `noticias` (pestaña de Inversiones; el menú resalta Inversiones), `alquiler`, `cuentas`, `importar` (pestaña de Cuentas, no está en el menú; el menú resalta Cuentas; `acctTabs`), `impuestos`, `claude`, `ajustes` |
| Noticias | Pantalla en tarjetas (`.nw`), agrupadas por día (`newsDay`), con logo de iniciales del medio (`newsLogo`, sin descargar logotipos), tema (`newsTopic`: `NEWS_TOPICS` por palabras del titular en ES/EN; lo que nombra tus posiciones → Empresas; si no, `NEWS_GENERAL`) y origen con bandera (`newsOrigin`: California por `NEWS_CAL`, si no la región más concreta del servidor o el dominio, `NEWS_TLD`). Chips de tema con recuento (`NEWS.topic`). `loadNews()` descarga `news.json` de la rama `news` (`newsURL()`, raw.githubusercontent.com) y lo guarda solo en memoria (`NEWS`). `newsRows()` filtra por pestaña; "Mi cartera" cruza en el navegador las posiciones (`myPositions()`) con `it.k` (símbolos buscados por el servidor) y con `newsMatcher()` (símbolo o nombre en el titular). Cada noticia trae del servidor `i` (impacto 0–3), `n` (medios que la publican) y `o` (otros enlaces): insignias "Alto impacto" (`i≥2`), "N medios" y "También en". **Preferencias aprendidas** (`settings.newsPrefs={w,rated,n,pend}`, dentro de la bóveda): `newsFeat` (tema, medio, región, símbolos, palabras del titular) → `newsPrefScore`; abrir una noticia (`newsOpen`, clic en `a[data-ni]`) suma un poco y la deja en `pend`; al volver (`visibilitychange`/`focus`/al entrar en Noticias) `newsAsk` pregunta si fue relevante (`#nfb`) y `newsFeedback` aprende ±1 (`newsLearn`, con olvido suave y máximo de 600 rasgos). Orden "Para ti" (por día; dentro del día `i` + preferencia) o "Recientes" (`settings.newsSort`); lo de `i=0` sin interés y lo que no te interesa queda plegado (`NEWS.showLow`, `#tLow`); "Lo que ha aprendido" (`newsPrefsHTML`) lo muestra y lo borra. Ajustes: `settings.newsTab`, `newsCountries`, `newsHide` (dominios ocultos). Atajos 1–6, `/`, `R` |
| Importar | Es una acción de Cuentas: alta de cuenta desde un extracto (`addAccountModal`, estado vacío con `#fFirst`; "Crear sin documento" → `editAccount`), botón "Importar" por cuenta (`IMPORT_FOR`: los archivos van a esa cuenta salvo que sus últimos 4 dígitos sean de otra; `forAcc`), `importFiles`/`openImport`. `IMPORT_NEW` preselecciona "cuenta nueva" en la revisión. Ambos se borran al salir de `#importar`. Lectores por entidad antes del genérico en `parseStatement`: `readBofA` (cuentas y tarjetas; en tarjetas usa la fecha de anotación), `readM1`, `readEmpower` (con `readFundTable`: tabla de fondos "How is my account invested?" → posiciones con `fund:true` y `cls`, guardadas con `saveFunds`); la rama de hipoteca entiende Pennymac y Wells Fargo. Devuelven `known:true` y `last4`. **Comprobación de exactitud**: `txCheck`/`stmtCheck` guardan en `r.check` si saldo inicial + movimientos = saldo final (tarjeta: anterior − nuevo; Empower: fondos = total = saldo); se muestra ✓/⚠ en el lote y en la revisión. `pdfText` agrupa líneas por altura con tolerancia según el tamaño de letra y lee las páginas de 4 en 4. **Extractos repetidos**: `S.imports` registra cada importación (`hash` SHA-256 del archivo y `fp`, huella del contenido: `fpPDF`/`fpTx`/`fpHold`/`fpTax`/hipoteca). `IMP_CTX` es la importación en curso (`startImport`; su id marca `t.st`); `dupCheck` la compara (lote: "ya importado" + botón "Importar de nuevo" → `importOne(f,true)`; revisión: `dupBanner()`), y `regImport` la registra reemplazando la anterior (quita su documento fiscal y resta su aportación). **Borrar una cuenta** (`deleteAccount`, `accountFootprint`): movimientos, saldos, posiciones, importaciones, documentos fiscales con `acc`, referencias y avisos ignorados. En el lote, `autoPDF` crea la cuenta si no existe (`newAccFrom`, nombre con `stmtAccName`), y `importBatch` salta archivos idénticos (SHA-256). `matchAccount` nunca elige una cuenta con otros últimos 4 dígitos. `importTxInto` marca cada movimiento con `st` (id del extracto) para no avisar de duplicados dentro del mismo extracto. Los fixtures `bofa_*`, `m1_cash`, `empower_q3` y `wf_mortgage` imitan la estructura real con datos inventados. CSV de banco/tarjeta (`handleCSV`, detección de columnas y signo), CSV de Holdings (`isHoldingsCSV`, `parseHoldings`), PDF (`pdfText` con pdf.js → `parseStatement` → hipoteca / genérico con `parseTxLines` / fiscal con `detectTaxForm` + `localTaxFields`). Cola de PDFs: `queuePDF`/`pdfDone` |
| Claude en PDFs | `redact()` (oculta cuentas, SSN, EIN, teléfonos, emails, direcciones y nombres de `settings.hideNames`) → `claudeExtract()` (JSON estructurado). Siempre pide confirmación salvo que `settings.autoClaude` esté activo |
| Impuestos | `TAXC` (tramos, deducción estándar, SALT, LTCG, CTC por año y estado civil), `CA_STD`, `computeTaxes(year, adj)`, `rentalSchedule` (Schedule E), `expectedDocs` |
| Jubilación | Pestaña de Inversiones (`#jubilacion`, `NAV_PARENT`). `retireData()` (saldo de las cuentas `retirement`, aportación anual de `a.contrib401` leída del extracto con `empowerContrib`, `settings.retire={by,age,ret,contrib,ss,goal}`), `retireAt()` (proyección en dólares de hoy con rentabilidad real; ingreso por la regla del 4 % + Seguridad Social ajustada con `SS_F`), `needExtra()` (aportación para un ingreso objetivo) y `retireTips()` (máximo del IRS con `LIM[año].k401/catch50/catch6063`, aportación de la empresa, acciones/bonos frente a una senda de fecha objetivo, internacional, fondos activos, solapes, tradicional/Roth por `computeTaxes().marginal`, 59½). Cuentas de jubilación sin fondos: tarjeta para importar su extracto (`data-impf`) |
| Optimizador | `LIM` (401k, IRA, HSA, DCFSA y límites de ingresos por año), `CA_BR`, perfil familiar `prof(year)`, `recommendations(year)` (ahorro estimado con `savingsOf` = what-if de `computeTaxes`), `taxTurbo` (guía TurboTax con las cifras del usuario) |
| Ajustes | Copia cifrada (`encryptState`/`decryptBackup`, formato v2, ver Seguridad; restaura también v1 y las copias de la versión antigua), seguridad, clave de API |
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
- Copias cifradas (`encryptState`/`decryptBackup`): formato v2 `{app:'misfinanzas',v:2,kdf,it:600000,salt,iv,data}`, PBKDF2-SHA256 600.000 iteraciones, AES-256-GCM con la cabecera como datos adicionales autenticados (`bkAAD`); contraseña mínima de 10 caracteres. v1 (250.000 iteraciones) se sigue pudiendo restaurar.
- Fuera de la bóveda solo hay: el idioma en `localStorage` y el código de la app en la caché del service worker. Cualquier exportación en claro (p. ej. el resumen fiscal .txt) debe avisar antes de descargarse.
- Usa siempre WebCrypto con algoritmos estándar (NIST/FIPS, BSI, ENISA); no implementes criptografía propia.
- **No hay scripts incrustados**: `script-src 'self'` sin `'unsafe-inline'`. No añadas `<script>` en línea ni atributos `onclick=`; todo va en `app.js` con `addEventListener`/`.onclick`. Escapa con `esc()` todo texto que vaya a `innerHTML`, también en atributos.
- La app se niega a ejecutarse dentro de un marco (clickjacking). `persist()` encola las escrituras; `lockNow()` y `pagehide` guardan lo pendiente con `flushSave()`.
- **Origen compartido**: en GitHub Pages, `marcos86go.github.io` es el mismo origen para todos los repositorios del usuario. No publiques otros sitios de Pages en esta cuenta (podrían leer el almacenamiento de la app). Si se necesita, mover MyFinZen a un dominio propio.
- GitHub Actions: acciones fijadas por SHA, `persist-credentials: false` y permisos mínimos (`contents: read`; `write` solo en el job de noticias).
- CSP en `<meta>`: solo `'self'`, `https://api.anthropic.com` y `https://raw.githubusercontent.com` (titulares públicos de la rama `news`). Si añades un servicio (por ejemplo Dropbox), amplía `connect-src` solo con sus dominios exactos.
- No añadas analítica, CDNs ni dependencias remotas. pdf.js está copiado en `vendor/`.

## Noticias (servidor)

- `.github/workflows/noticias.yml` corre cada hora (y al cambiar `news/**`): `node news/build.mjs out/news.json prev.json` y reescribe la rama `news` con un solo commit.
- `news/sources.json`: regiones, feeds RSS directos y búsquedas de Google News por edición (`gn`), **`trusted`** (lista blanca: solo se publican esos medios; 1 = agencia, pública o redacción de referencia, 2 = prensa reconocida), `paywall` (dominio o dominio/ruta; también muros dinámicos o por cuota, como bbc.com en EE. UU., cnn.com o reuters.com) y `skip` (agregadores con contenido patrocinado, notas de prensa, medios estatales de países sin prensa libre). Solo medios contrastados y de acceso libre. Si cambias listas o filtros, sube `FORMAT` en build.mjs para descartar lo acumulado.
- `build.mjs`: `normalize` (con `trustTier` e `isJunk`: opinión, patrocinado, "acciones para comprar", predicciones de precio, rutas /opinion/, /select/…), `merge`, `cluster` (misma noticia en varios medios por palabras del titular con `sameStory`, ventana de 36 h; representante = medio de nivel 1 más antiguo; `n`, `o`) e `impact` (tema HI/MID + número de medios) antes de `trim`.
- `news/universe.json`: lista **pública** de símbolos `{s,t,n,a}`; cada ejecución busca una cuarta parte (todo en la primera). Nunca añadas aquí las posiciones del usuario por iniciativa propia: es un repo público.
- `news.json`: `{v,updated,regions[],universe[],feeds[{id,region,ok,n,err}],tickers{},items[{t,u,s,d,p,i,r?,k?,n?,o?[{s,u,d}]}]}`. Si ninguna fuente responde, la tarea falla y se conserva la versión anterior.
- Pruebas sin red: `node tests/news.mjs`.

## Probar

```bash
npm i && npx playwright install chromium
npm run fixtures   # genera PDFs/CSVs inventados en tests/fixtures
npm test           # 11 pruebas del recolector de noticias + 110 end-to-end (passkey con autenticador virtual PRF, API de Claude simulada; también comprueba que todas las pantallas salen en inglés)
```

Antes de cada commit, pasa `npm test`. Para cambios visuales, haz capturas con Playwright en móvil (412×900) y en escritorio (1200×900), en los dos idiomas, y revísalas (`SHOTS=/ruta npm test` guarda capturas).

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
- Dividir `app.js` en módulos si supera ~2.500 líneas.
- Si algún día se comercializa: revisar licencia, el contrato laboral del autor (California Labor Code 2870) y valorar repo privado.
