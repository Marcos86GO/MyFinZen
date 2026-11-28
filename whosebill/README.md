# WhoseBill?

**Quién paga qué en el ticket del restaurante: por tarjeta y por persona.** Haces una foto del ticket, la app la lee en tu dispositivo (sin enviarla a ningún sitio) y reparte el total entre las tarjetas con las que se paga: a partes iguales o por persona, según lo que pidió cada una.

WhoseBill? es una app independiente (`https://marcos86go.github.io/MyFinZen/whosebill/`, instalable como PWA, con sus propios usuarios) y a la vez un **módulo** que MyFinZen integra en su menú con el usuario de MyFinZen, sin un segundo login. Es **el mismo código** en los dos sitios: todo el desarrollo de WhoseBill? se hace en esta carpeta.

## Estructura

| Archivo | Qué es |
|---|---|
| `core/split.js` | El módulo: pantallas (nuevo ticket, preferencias, ticket, cómo pagáis, historial), cálculo del reparto y validación de los datos (`sanitizeSplits`, `sanitizeSplitPrefs`). No depende de ninguna app concreta: usa la interfaz del anfitrión (abajo) |
| `core/ticket.js` | Lector local de tickets: prepara la foto (papel, enderezar, sombras), Tesseract y `parseReceipt` |
| `core/help.js` | Textos de ayuda (icono «i») en español e inglés; se suman a `window.HELP` del anfitrión |
| `core/whosebill.css` | Estilos de las pantallas del módulo (clases `sp-*`) |
| `vendor/ocr/` | Tesseract.js 7 (Apache 2.0), copiado: sin CDN. Se descarga al usarlo por primera vez y se guarda en la caché `whosebill-ocr-…` |
| `index.html`, `app.js`, `base.css`, `style.css` | La app independiente: anfitrión con usuarios locales cifrados (contraseña, passkey y clave de recuperación), perfil y seguridad, idioma por usuario |
| `manifest.webmanifest`, `sw.js`, `icons/` | Instalación y uso sin conexión de la app independiente. `icons/make-icons.py` genera el logo |

## Interfaz del anfitrión

`core/split.js` y `core/ticket.js` se cargan **después** del código del anfitrión, que debe dar estas globales:

- **Datos:** `S` (objeto del usuario abierto, `null` si está bloqueado) con `S.splits` (tickets) y `S.settings.split` (preferencias); `save()` (guarda `S` cifrado, con retardo).
- **Pantallas:** `VIEWS` (el módulo registra `VIEWS.whosebill(el)`), `$` (querySelector), `helpBtn(clave)`, `openModal(html)`, `closeModal()`, `confirmModal(título, html)` → `Promise<boolean>`, `toast(texto)`, `ic(nombreIcono)` con los iconos `camera`, `upload`, `edit`, `receipt`, `trash`, `plus`, `close`, `card`, `star`.
- **Idioma y formato:** `L(es, en)`, `LANG`, `fmt(n, decimales)`, `dLabel(fechaISO)`.
- **Utilidades:** `esc`, `num`, `numStrict`, `r2`, `uid`, `today`, `isoDate`, `str`, `arr`, `obj`, `cleanId`.
- **Opcional:** `spHostActive()` (si la pantalla del módulo es la que se ve; si no existe, el módulo usa el hash `#whosebill`) y `S.accounts` (sus tarjetas de crédito salen como sugerencias de nombre).
- **Al bloquear**, el anfitrión llama a `splitOnLock()` (descarta las fotos de la memoria y cierra el lector).
- **Al desbloquear o restaurar**, valida los datos con `sanitizeSplits(S.splits)` y `sanitizeSplitPrefs(S.settings.split)`.

Así lo hacen `app.js` (esta app) y el `app.js` de MyFinZen (raíz del repositorio).

## Privacidad

La foto se lee en el dispositivo y nunca se guarda (solo vive en memoria hasta abrir otro ticket o bloquear). Los tickets y las preferencias se guardan cifrados con el usuario del anfitrión. No hay servidor, analítica ni dependencias remotas; la CSP de la app independiente no permite conectarse a nada.

## Publicar un cambio

1. Sube `VERSION` en `whosebill/sw.js` (`w1.x.y`).
2. Si cambias algo de `core/`, sube también `VERSION` en el `sw.js` de MyFinZen (lo integra).
3. `npm test` en la raíz del repositorio (también prueba WhoseBill?) y commit en `main`.
