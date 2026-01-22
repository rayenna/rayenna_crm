// Help section index file
export * from './sections'
export * from './tooltips'
import { helpSections, getHelpSectionForRoute, HelpSection } from './sections'
import { helpTooltips, getHelpTooltip, HelpTooltip } from './tooltips'

/**
 * Get markdown file path for a given route
 * @param route - Route path (e.g., '/dashboard', '/projects')
 * @returns Markdown file path or null
 */
export const getHelpByRoute = (route: string): string | null => {
  const sectionId = getHelpSectionForRoute(route)
  if (!sectionId) return null

  const section = helpSections.find(s => s.id === sectionId)
  return section?.markdownPath || null
}

/**
 * Get tooltip text for a given help key
 * @param helpKey - Help tooltip key (e.g., 'dashboard.total-leads')
 * @returns Tooltip text content or null
 */
export const getTooltipText = (helpKey: string): string | null => {
  const tooltip = getHelpTooltip(helpKey)
  return tooltip?.content || null
}

/**
 * Get full tooltip object for a given help key
 * @param helpKey - Help tooltip key
 * @returns HelpTooltip object or null
 */
export const getTooltip = (helpKey: string): HelpTooltip | null => {
  return getHelpTooltip(helpKey)
}

/**
 * Get help section for a given route
 * @param route - Route path
 * @returns HelpSection or null
 */
export const getHelpSection = (route: string): HelpSection | null => {
  const sectionId = getHelpSectionForRoute(route)
  if (!sectionId) return null

  return helpSections.find(s => s.id === sectionId) || null
}

/**
 * Get all available help sections
 * @returns Array of HelpSection
 */
export const getAllHelpSections = (): HelpSection[] => {
  return helpSections
}

/**
 * Get all available tooltip keys
 * @returns Array of tooltip keys
 */
export const getAllTooltipKeys = (): string[] => {
  return Object.keys(helpTooltips)
}
