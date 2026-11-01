# MyFinZen

Web app de finanzas personales, datos locales y seguros. Manual pero sin riesgos.

Cuentas, hipotecas (con simulador de pagos extra), inversiones (incluye el CSV de Holdings de M1 y una terminal de noticias), casa en alquiler, ingresos y gastos con conciliación entre cuentas y categorías propias, e impuestos federales y de California con guía paso a paso para TurboTax.

En **español e inglés** (*Copia y ajustes → Idioma*). Cada sección tiene un icono **i** con su explicación y un pequeño tutorial, y la pestaña **Manual** reúne la guía completa.

*Personal finance app with local, encrypted data. Available in Spanish and English; switch in Backup & settings → Language.*

## Privacidad y seguridad

- **Tus datos nunca están en este repositorio ni en ningún servidor.** Se guardan cifrados (AES-GCM 256) en el navegador de cada dispositivo.
- **Contraseña maestra** (PBKDF2-SHA256, 600.000 iteraciones), **passkey** con huella o cara (WebAuthn PRF) y **clave de recuperación** de un solo uso. Sin ellas, los datos son ilegibles. Nadie puede recuperarlas por ti.
- **Bloqueo automático** tras unos minutos sin uso.
- Los extractos (PDF y CSV) se leen dentro del navegador; los archivos no se suben a ningún sitio.
- **Claude es opcional.** Si añades tu propia clave de API de Anthropic, la app envía a Claude solo resúmenes de cifras o texto con números de cuenta, SSN, teléfonos, emails y direcciones ocultos, y siempre con tu confirmación. La clave se guarda cifrada y no se incluye en las copias.
- Política de seguridad de contenido estricta: la app solo puede conectarse a sí misma, a `api.anthropic.com` y a `raw.githubusercontent.com` (para descargar los titulares públicos).

## Instalar

1. Abre la web publicada en GitHub Pages.
2. **Android (Chrome):** menú ⋮ → *Instalar app* o *Añadir a pantalla de inicio*.
3. **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.
4. **Ordenador (Chrome / Edge):** icono de instalar en la barra de direcciones.

La primera vez crearás tu contraseña maestra, guardarás la clave de recuperación y, si quieres, una passkey.

## Noticias

*Inversiones → Noticias* es una terminal con titulares de medios de acceso libre, con enlace a la web que publica cada noticia: **Mi cartera** (tus posiciones), **Global**, **EE. UU.**, **Europa**, **España** y **Países** (eliges cuáles).

- La tarea de GitHub Actions `Noticias` (`.github/workflows/noticias.yml`) se ejecuta cada hora, lee las fuentes de `news/sources.json` y publica `news.json` en la rama `news`. No necesita configuración.
- Las búsquedas por símbolo usan la lista pública `news/universe.json` (unos 210 ETFs y acciones). La app filtra en tu dispositivo las de tus posiciones: tu cartera no se sube a ningún sitio.
- Los medios de pago y los agregadores automáticos se descartan con las listas `paywall` y `skip` de `news/sources.json`. Si se cuela alguno, ocúltalo con la ✕ de la noticia.
- Si las noticias dejan de actualizarse (GitHub pausa las tareas programadas tras 60 días sin actividad en el repositorio): *Actions → Noticias → Enable workflow* o *Run workflow*.

## Pasar datos entre dispositivos

*Copia y ajustes → Crear copia cifrada* genera un archivo `.json` cifrado con la contraseña que elijas. Guárdalo donde quieras (Dropbox, por ejemplo) y restáuralo en el otro dispositivo con *Restaurar copia*. También acepta las copias de la versión anterior de claude.ai.

## Publicar cambios

1. Edita los archivos y súbelos a `main`.
2. Sube `VERSION` en `sw.js` para que los dispositivos instalados detecten la actualización. Al abrir la app aparecerá *Hay una versión nueva → Actualizar*.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app (interfaz, cálculos, cifrado) |
| `help.js` | Textos de ayuda de cada sección y manual de usuario, en español e inglés |
| `sw.js` | Service worker: funcionamiento sin conexión y actualizaciones |
| `manifest.webmanifest` | Nombre, iconos y modo app |
| `icons/` | Iconos de la app |
| `news/` | Recolector de noticias: fuentes, lista de símbolos y `build.mjs` (lo ejecuta GitHub Actions) |
| `vendor/` | [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 (Apache 2.0) para leer PDFs en local |

## Aviso

Las estimaciones fiscales son orientativas y no sustituyen a un preparador, un CPA o un enrolled agent.
