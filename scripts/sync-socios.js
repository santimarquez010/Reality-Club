// Genera las páginas de los socios a partir de las páginas originales.
//   public/index.html  ->  public/pv-socio.html     (realityclub.co/pv-socio)
//   public/video.html  ->  public/video-socio.html  (realityclub.co/video-socio)
//
// En las copias: agrega <meta name="robots" content="noindex">, agrega el script de socios
// justo antes de </head> y quita el píxel de Meta de Reality Club (si lo hay).
// Todo lo demás queda igual. Nunca edites las copias a mano: edita el original y corre
//   node scripts/sync-socios.js
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const SOCIOS_SCRIPT = '<script src="https://socios-realityclub.vercel.app/s.js" defer></script>';
const PAGES = [
  ['index.html', 'pv-socio.html'],
  ['video.html', 'video-socio.html'],
];

function fail(msg) { console.error('ERROR: ' + msg); process.exit(1); }

function quitarPixelMeta(html) {
  return html
    .replace(/[ \t]*<!--\s*(End\s+)?Meta Pixel Code\s*-->[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<script\b[^>]*>(?:(?!<\/script>)[\s\S])*?(?:fbq\s*\(|fbevents\.js)(?:(?!<\/script>)[\s\S])*?<\/script>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<script\b[^>]*src="[^"]*connect\.facebook\.net[^"]*"[^>]*>\s*<\/script>[ \t]*\r?\n?/gi, '')
    .replace(/[ \t]*<noscript\b[^>]*>(?:(?!<\/noscript>)[\s\S])*?facebook\.com\/tr(?:(?!<\/noscript>)[\s\S])*?<\/noscript>[ \t]*\r?\n?/gi, '');
}

for (const [origen, destino] of PAGES) {
  const src = path.join(PUB, origen);
  if (!fs.existsSync(src)) fail('no existe ' + origen);
  let html = fs.readFileSync(src, 'utf8');
  if (html.includes('socios-realityclub.vercel.app')) fail(origen + ' no debe tener el script de socios');
  const nl = html.includes('\r\n') ? '\r\n' : '\n';

  html = quitarPixelMeta(html);
  html = html.replace(/[ \t]*<meta\s+name="robots"[^>]*>[ \t]*\r?\n?/gi, '');
  if (!/<\/head>/i.test(html)) fail(origen + ' no tiene </head>');
  html = html.replace(/<\/head>/i, '<meta name="robots" content="noindex">' + nl + SOCIOS_SCRIPT + nl + '</head>');

  if (/fbq\s*\(|fbevents\.js|connect\.facebook\.net/i.test(html)) fail(destino + ' todavía tiene restos del píxel de Meta');
  fs.writeFileSync(path.join(PUB, destino), html);
  console.log('ok  ' + origen + '  ->  ' + destino);
}
