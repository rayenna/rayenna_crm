/**
 * Load help markdown at build time (no runtime fetch) – works reliably in dev and prod.
 * Uses Vite's import.meta.glob with ?raw so markdown is bundled.
 */
const contentModules = import.meta.glob<string>('./content/*/index.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function getHelpContent(sectionId: string): string {
  const path = `./content/${sectionId}/index.md`
  const content = (contentModules as Record<string, string>)[path]
  return content ?? ''
}
