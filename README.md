# MyFinZen

Web app de finanzas personales, datos locales y seguros. Manual pero sin riesgos.

Cuentas, hipotecas (con simulador de pagos extra), inversiones (incluye el CSV de Holdings de M1), casa en alquiler, ingresos y gastos, e impuestos federales y de California con guía paso a paso para TurboTax.

## Privacidad y seguridad

- **Tus datos nunca están en este repositorio ni en ningún servidor.** Se guardan cifrados (AES-GCM 256) en el navegador de cada dispositivo.
- **Contraseña maestra** (PBKDF2-SHA256, 600.000 iteraciones), **passkey** con huella o cara (WebAuthn PRF) y **clave de recuperación** de un solo uso. Sin ellas, los datos son ilegibles. Nadie puede recuperarlas por ti.
- **Bloqueo automático** tras unos minutos sin uso.
- Los extractos (PDF y CSV) se leen dentro del navegador; los archivos no se suben a ningún sitio.
- **Claude es opcional.** Si añades tu propia clave de API de Anthropic, la app envía a Claude solo resúmenes de cifras o texto con números de cuenta, SSN, teléfonos, emails y direcciones ocultos, y siempre con tu confirmación. La clave se guarda cifrada y no se incluye en las copias.
- Política de seguridad de contenido estricta: la app solo puede conectarse a sí misma y a `api.anthropic.com`.

## Instalar

1. Abre la web publicada en GitHub Pages.
2. **Android (Chrome):** menú ⋮ → *Instalar app* o *Añadir a pantalla de inicio*.
3. **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.
4. **Ordenador (Chrome / Edge):** icono de instalar en la barra de direcciones.

La primera vez crearás tu contraseña maestra, guardarás la clave de recuperación y, si quieres, una passkey.

## Pasar datos entre dispositivos

*Copia y ajustes → Crear copia cifrada* genera un archivo `.json` cifrado con la contraseña que elijas. Guárdalo donde quieras (Dropbox, por ejemplo) y restáuralo en el otro dispositivo con *Restaurar copia*. También acepta las copias de la versión anterior de claude.ai.

## Publicar cambios

1. Edita los archivos y súbelos a `main`.
2. Sube `VERSION` en `sw.js` para que los dispositivos instalados detecten la actualización. Al abrir la app aparecerá *Hay una versión nueva → Actualizar*.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app (interfaz, cálculos, cifrado) |
| `sw.js` | Service worker: funcionamiento sin conexión y actualizaciones |
| `manifest.webmanifest` | Nombre, iconos y modo app |
| `icons/` | Iconos de la app |
| `vendor/` | [pdf.js](https://mozilla.github.io/pdf.js/) 3.11.174 (Apache 2.0) para leer PDFs en local |

## Aviso

Las estimaciones fiscales son orientativas y no sustituyen a un preparador, un CPA o un enrolled agent.
