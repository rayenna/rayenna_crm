/**
 * Copies versioned .githooks into .git/hooks so pre-push runs locally.
 * Does not change git config.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const gitDir = path.join(root, '.git')
const destDir = path.join(gitDir, 'hooks')
const srcDir = path.join(root, '.githooks')

if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
  process.exit(0)
}

if (!fs.existsSync(srcDir)) {
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

for (const name of fs.readdirSync(srcDir)) {
  if (name.startsWith('.')) continue
  const src = path.join(srcDir, name)
  if (!fs.statSync(src).isFile()) continue
  const dest = path.join(destDir, name)
  fs.copyFileSync(src, dest)
  fs.chmodSync(dest, 0o755)
}
