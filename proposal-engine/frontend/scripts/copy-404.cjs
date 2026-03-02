/**
 * Copy dist/index.html to dist/404.html for SPA fallback on Render/static hosts.
 * Uses CommonJS so it runs reliably when package.json has "type": "module".
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
  fs.copyFileSync(srcFile, destFile);
  console.log('copy-404: dist/404.html created for SPA fallback');
} catch (err) {
  console.warn('copy-404: failed to copy:', err.message);
  process.exit(0); // Do not fail the build
}
