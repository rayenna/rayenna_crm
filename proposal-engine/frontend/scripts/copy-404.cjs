/**
 * Copy dist/index.html to dist/404.html for SPA fallback on Render/static hosts.
 * Uses CommonJS so it runs reliably when package.json has "type": "module".
 *
 * Render serves unknown paths from 404.html; index.html and 404.html must reference
 * the same hashed assets or deep links load a stale bundle.
 */
const fs   = require('fs');
const path = require('path');

const distDir  = path.join(__dirname, '..', 'dist');
const srcFile  = path.join(distDir, 'index.html');
const destFile = path.join(distDir, '404.html');

try {
  if (!fs.existsSync(srcFile)) {
    console.warn('copy-404: dist/index.html not found, skipping 404 copy');
    process.exit(0);
  }
  const html = fs.readFileSync(srcFile, 'utf8');
  fs.writeFileSync(destFile, html, 'utf8');
  const copied = fs.readFileSync(destFile, 'utf8');
  if (copied !== html) {
    console.error('copy-404: 404.html verification failed (content mismatch)');
    process.exit(1);
  }
  const indexJs = html.match(/\/assets\/index-[^"]+\.js/);
  const html404Js = copied.match(/\/assets\/index-[^"]+\.js/);
  if (!indexJs || !html404Js || indexJs[0] !== html404Js[0]) {
    console.error('copy-404: index bundle ref missing or mismatched in 404.html');
    process.exit(1);
  }
  console.log(`copy-404: dist/404.html synced with index.html (${indexJs[0]})`);
} catch (err) {
  console.error('copy-404: failed:', err.message);
  process.exit(1);
}
