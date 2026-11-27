# Reality Club · sitio web

Sitio HTML estático (sin build) en `public/`. Se publica en Cloudflare Workers (static assets, Worker `reality-club`, ver `wrangler.jsonc`): cada push a `main` despliega solo en realityclub.co. Un archivo `public/x.html` abre en `realityclub.co/x`.

## Páginas

| Archivo | Dirección | Nota |
|---|---|---|
| `index.html` | `/` | Página de ventas principal |
| `video.html` | `/video` | VSL principal (el video y su headline vienen del código de vturb) |
| `pv-socio.html` | `/pv-socio` | Copia de `index.html` para los socios. **Generada, no editar** |
| `video-socio.html` | `/video-socio` | Copia de `video.html` para los socios. **Generada, no editar** |
| `botonrojo.html` | `/botonrojo` | VSL de El Botón Rojo (colores rojo/blanco del empaque, favicon `assets/botonrojo-*`, sin píxel de Meta por ahora). Debajo del texto del video va el widget de embudo de Hotmart (`#hotmart-sales-funnel` dentro de `#comprar`) |
| `botonrojo37.html` | `/botonrojo37` | Downsell de El Botón Rojo a 37 USD (normal 67, VSL 47). `noindex`, cuenta regresiva de 10 min por visitante en `localStorage` (`br37-fin`); al vencer se oculta la oferta. La compra va en el widget de embudo de Hotmart (`#hotmart-sales-funnel`, dentro de `#comprar`), que trae sus propios botones de aceptar y rechazar; el botón de la tarjeta y el botón flotante llevan a `#comprar` |
| `gracias.html` | `/gracias` | Página de gracias al final del embudo (después de Reality Club y El Botón Rojo). `noindex`, píxel de Meta solo con `PageView` (la compra la marca Hotmart), botón a `consumer.hotmart.com` |
| `bibliotecadeprompts.html` | `/bibliotecadeprompts` | Para compradores, `noindex`, sin enlaces desde la página de ventas |
| `terminos.html`, `privacidad.html` | `/terminos`, `/privacidad` | Páginas legales |

## Páginas de socios (reglas obligatorias)

- `pv-socio.html` y `video-socio.html` se generan con `node scripts/sync-socios.js`. Nunca se editan a mano.
- **Después de cualquier cambio en `index.html` o `video.html`, corre `node scripts/sync-socios.js` antes de hacer commit**, y sube las copias en el mismo commit.
- El script copia el original exacto y en la copia: agrega `<meta name="robots" content="noindex">`, agrega `<script src="https://socios-realityclub.vercel.app/s.js" defer></script>` justo antes de `</head>`, cambia el checkout de Hotmart principal por el de socios, y quita el píxel de Meta de Reality Club (`fbq(...)`, `fbevents.js`, `connect.facebook.net`, `facebook.com/tr`). En las páginas de socios solo va el píxel del socio, que lo prende `s.js`.
- `index.html` y `video.html` nunca llevan el script de socios.
- `index.html` y `video.html` llevan, justo antes de `</body>`, el rastreo de ventas `<script src="https://cerebrocentro.vercel.app/rastreo.js" defer></script>` (copia `src`, `sck` y `utm_*` a los botones de Hotmart). Va solo en las páginas originales: el script de sincronización lo quita de las copias de socios.
- Checkout de Hotmart:
  - Principal (páginas originales): `https://pay.hotmart.com/E108564799D?off=ir3bjgrz&checkoutMode=10`
  - Socios (páginas de socios): `https://pay.hotmart.com/E108564799D?off=gx41m0kn&checkoutMode=10`
  - En el HTML original solo se escribe el principal; los botones de pago llevan `data-checkout` (el botón flotante toma de ahí el enlace). El script cambia `off=ir3bjgrz` por `off=gx41m0kn` en las copias.
- Los archivos van en la raíz de `public/` (no en carpetas `pv-socio/index.html`), para que la dirección no tenga barra al final y carguen las rutas relativas (`assets/`, `css/`, `js/`).
- No enlazar las páginas de socios desde el menú, el pie de página ni un sitemap.
- Si algún día el sitio envía `Content-Security-Policy`, permitir `https://socios-realityclub.vercel.app`, `https://connect.facebook.net` y `https://www.facebook.com` en `script-src`, `connect-src` e `img-src`.

## Velocidad de carga

- En `index.html` la foto principal es un `<picture>` (foto de celular hasta 899px; AVIF, luego WebP, luego JPG: `assets/hero-m.*` y `assets/hero-d.*`. Al convertir JPG con ffmpeg, usar `scale=in_range=full` para no lavar los colores) con `fetchpriority="high"` y sin `loading="lazy"`. Ninguna otra imagen va con `loading="eager"`: todas las demás llevan `loading="lazy"`.
- Los videos de `index.html` llevan la portada en `data-poster` (no en `poster`); `js/main.js` la pone cuando su sección se acerca a la pantalla. Todo video nuevo va igual.
- Las fuentes de Google cargan sin bloquear (`preload` + `media="print" onload`) en `index.html` y `botonrojo.html`.
- En `botonrojo.html` el alto del reproductor de vturb está reservado (`28px + 94.7%` del ancho, medido con su headline). Si cambia el headline o el video en vturb, volver a medirlo.

## Estilo y textos

- Siempre "socios", nunca "afiliados". Comisión: 50%.
- Colores: fondo `#041E21`, cian `#25D5E9`, verde de botones `#34E39B`. Letras: Montserrat (títulos) e Inter.
- Logos para fondo oscuro: `assets/logo-r.png` (la R) y `assets/logo-reality-club.png` (REALITY CLUB). Favicon: `assets/favicon-32.png`, `assets/favicon-512.png`, `assets/apple-touch-icon.png` y `favicon.ico`.
