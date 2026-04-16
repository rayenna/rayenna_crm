
type Block =
  | { type: 'title'; text: string }
  | { type: 'subtitle'; text: string }
  | { type: 'label'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'paragraph'; text: string }

const RAW_LINES: string[] = [
  'Rayenna Energy CRM - Customer Relationship Management Platform',
  '',
  'Title Credits',
  '',
  'Product Name: Rayenna Energy CRM',
  'Product Category: Custom Enterprise CRM Platform',
  '',
  'Concept, Architecture, Design & Development:',
  '',
  'SHABEER MOHAMED KOZHAKKANIYIL – Director, Rayenna Energy Private Limited',
  '',
  'Role:',
  '# Sole Architect & Developer',
  '# Technology Stack Selection',
  '# Database & Data Model Design',
  '# Workflow & Business Logic Design',
  '# Feature & Functionality Definition',
  '# User Interface & User Experience Design',
  '# System Integration & Customization',
  '',
  'Development Background',
  '',
  'This CRM platform was custom-designed and developed specifically for the operational needs of Rayenna Energy Private Limited.',
  'Initial workflows and data structures were informed by the Company’s internal cadence, lead capture formats, and project tracking processes. The software implementation, system architecture, logic, design patterns, and user experience represent original work independently conceived and executed by the developer.',
  '',
  'Intellectual Property & Copyright Notice',
  '',
  '©2026 – Present',
  '',
  'This software, including but not limited to:',
  '# Source code and object code',
  '# Database schemas and structures',
  '# Application workflows and logic',
  '# User interface designs and layouts',
  '# Documentation, configurations, and system behavior',
  '',
  'is protected under applicable copyright, intellectual property, and software protection laws.',
  '',
  'All rights reserved.',
  '',
  'Authorship & Inventorship Declaration',
  '',
  'The CRM platform is an original work of authorship created by SHABEER MOHAMED KOZHAKKANIYIL. Any novel methods, processes, workflows, or system designs embodied in this software may constitute proprietary inventions and are subject to protection under applicable intellectual property laws, including but not limited to patent laws, where applicable.',
  '',
  'Ownership & Assignment Clarification',
  '',
  'Unless otherwise expressly assigned in writing: The authorship and inventorship of this software and its underlying systems remain attributable to SHABEER MOHAMED KOZHAKKANIYIL. Any usage, deployment, or operational use of this software by Rayenna Energy Private Limited does not, by itself, constitute a waiver or automatic transfer of inventorship rights. Ownership, licensing, or assignment of intellectual property rights—whether to the Company or jointly—shall be governed exclusively by separate written agreements, board resolutions, or statutory filings, as applicable.',
  '',
  'Restrictions',
  '',
  'No part of this software may be Reproduced, Modified, Reverse engineered, Distributed, Licensed, Transferred in whole or in part, without explicit written authorization from the rightful intellectual property owner(s).',
  '',
  'Confidentiality Notice',
  '',
  'This software contains proprietary and confidential information intended solely for authorized internal use by Rayenna Energy Private Limited. Unauthorized access, disclosure, or use is strictly prohibited.',
]

function isSectionTitle(line: string, nextLine: string | undefined): boolean {
  if (!line.trim()) return false
  if (line.trim().startsWith('#')) return false
  // Heuristic: stand-alone line followed by a blank line => treat as title/subtitle
  return (nextLine ?? '').trim() === ''
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const next = lines[i + 1]

    if (!line.trim()) {
      i += 1
      continue
    }

    // Bullets
    if (line.trim().startsWith('#')) {
      const items: string[] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('#')) {
        items.push((lines[i] ?? '').trim().replace(/^#\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'bullets', items })
      continue
    }

    // Titles/subtitles (stand-alone line + blank line next)
    if (isSectionTitle(line, next)) {
      // Lines ending with ":" render as un-bold label; first line = title, others = subtitle
      if (line.trim().endsWith(':')) {
        blocks.push({ type: 'label', text: line.trim() })
      } else {
        const kind: Block['type'] = blocks.length === 0 ? 'title' : 'subtitle'
        blocks.push({ type: kind, text: line.trim() } as Block)
      }
      i += 1
      continue
    }

    // Paragraph (consume until blank line)
    const paraLines: string[] = []
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !(lines[i] ?? '').trim().startsWith('#')) {
      // Stop if we hit a stand-alone header pattern
      if (i !== 0 && isSectionTitle(lines[i] ?? '', lines[i + 1])) break
      paraLines.push((lines[i] ?? '').trim())
      i += 1
    }
    const text = paraLines.join(' ')
    if (text) blocks.push({ type: 'paragraph', text })
  }

  return blocks
}

const blocks = parseBlocks(RAW_LINES)

// From "Authorship & Inventorship Declaration" till end: only these headings stay bold
const CONTENT_SECTION_HEADINGS = new Set([
  'Authorship & Inventorship Declaration',
  'Ownership & Assignment Clarification',
  'Restrictions',
  'Confidentiality Notice',
])
// Stand-alone lines that are body text, not headings – render as normal weight
const NORMAL_WEIGHT_SUBTITLES = new Set([
  'is protected under applicable copyright, intellectual property, and software protection laws.',
])
const authorshipBlockIndex = blocks.findIndex(
  (b) => b.type === 'subtitle' && b.text === 'Authorship & Inventorship Declaration'
)
const devBgBlockIndex = blocks.findIndex(
  (b) => b.type === 'subtitle' && b.text === 'Development Background'
)
const blocksBeforeDevBg = devBgBlockIndex >= 0 ? blocks.slice(0, devBgBlockIndex) : blocks
const mainTitleBlock = blocksBeforeDevBg[0]?.type === 'title' ? blocksBeforeDevBg[0] : null
const titleCreditsBlocksRaw = mainTitleBlock ? blocksBeforeDevBg.slice(1) : blocksBeforeDevBg
// Skip duplicate "Title Credits" subtitle inside the card (card heading already shows it)
const titleCreditsBlocks = titleCreditsBlocksRaw.filter(
  (b) => !(b.type === 'subtitle' && b.text === 'Title Credits')
)
const blocksFromDevBg = devBgBlockIndex >= 0 ? blocks.slice(devBgBlockIndex) : []

// Section headings for the content cards (in display order)
const CONTENT_SECTION_ORDER = [
  'Development Background',
  'Intellectual Property & Copyright Notice',
  'Authorship & Inventorship Declaration',
  'Ownership & Assignment Clarification',
  'Restrictions',
  'Confidentiality Notice',
]
const contentSectionSet = new Set(CONTENT_SECTION_ORDER)

// Split blocksFromDevBg into groups by section heading
function splitIntoSections(blks: Block[]): { heading: string; blocks: Block[]; startIdx: number }[] {
  const sections: { heading: string; blocks: Block[]; startIdx: number }[] = []
  let current: { heading: string; blocks: Block[]; startIdx: number } | null = null

  for (let i = 0; i < blks.length; i++) {
    const b = blks[i]!
    if (b.type === 'subtitle' && contentSectionSet.has(b.text)) {
      if (current) sections.push(current)
      current = { heading: b.text, blocks: [], startIdx: devBgBlockIndex + i }
    }
    if (current) current.blocks.push(b)
  }
  if (current) sections.push(current)
  return sections
}

const contentSections = splitIntoSections(blocksFromDevBg)

// Gradient pairs for section card headings (cycle through)
const SECTION_HEADING_GRADIENTS = [
  'from-primary-600 to-amber-500',
  'from-indigo-600 to-cyan-600',
  'from-purple-600 to-pink-600',
  'from-primary-600 to-cyan-600',
  'from-amber-600 to-orange-500',
  'from-violet-600 to-fuchsia-500',
]

// Dark Zenith background needs brighter ramps (Tailwind indigo/primary can read too dim).
const SECTION_HEADING_GRADIENTS_ZENITH = [
  'from-[color:var(--accent-gold)] to-[color:var(--accent-teal)]',
  'from-[color:var(--accent-teal)] to-[color:var(--accent-blue)]',
  'from-[color:var(--accent-amber)] to-[color:var(--accent-purple)]',
  'from-[color:var(--accent-teal)] to-[color:var(--accent-amber)]',
  'from-[color:var(--accent-red)] to-[color:var(--accent-blue)]',
  'from-[color:var(--accent-purple)] to-[color:var(--accent-teal)]',
]

function renderBlock(b: Block, idx: number, zenith: boolean) {
  if (b.type === 'title') {
    return (
      <div key={idx} className="space-y-2">
        <h3
          className={
            zenith
              ? 'zenith-display bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)] bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:text-xl'
              : 'text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent'
          }
        >
          {b.text}
        </h3>
        <div
          className={
            zenith
              ? 'h-1 w-24 rounded-full bg-gradient-to-r from-[color:var(--accent-gold)] to-[color:var(--accent-teal)]'
              : 'h-1 w-24 rounded-full bg-gradient-to-r from-primary-600 to-yellow-500'
          }
        />
      </div>
    )
  }
  if (b.type === 'subtitle') {
    const inContentSection = authorshipBlockIndex >= 0 && idx >= authorshipBlockIndex
    const isNormalWeight = NORMAL_WEIGHT_SUBTITLES.has(b.text)
    const isBold = !isNormalWeight && (!inContentSection || CONTENT_SECTION_HEADINGS.has(b.text))
    return (
      <h4
        key={idx}
        className={`text-base sm:text-lg ${isBold ? 'font-bold' : 'font-normal'} ${
          zenith ? (isBold ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-secondary)]') : 'text-gray-900'
        }`}
      >
        {b.text}
      </h4>
    )
  }
  if (b.type === 'label') {
    return (
      <p key={idx} className={`text-sm font-normal sm:text-base ${zenith ? 'text-[color:var(--accent-teal)]' : 'text-gray-700'}`}>
        {b.text}
      </p>
    )
  }
  if (b.type === 'bullets') {
    return (
      <ul key={idx} className="space-y-2">
        {b.items.map((it, j) => (
          <li key={j} className="flex gap-3">
            <span
              className={
                zenith
                  ? 'mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--accent-gold)] to-[color:var(--accent-teal)] text-[0.65rem] font-bold text-[color:var(--text-inverse)] shadow-md'
                  : 'mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-yellow-500 text-white text-xs shadow'
              }
            >
              ✓
            </span>
            <span
              className={`max-w-full break-words text-sm leading-relaxed whitespace-normal sm:text-base ${
                zenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'
              }`}
              style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
            >
              {it}
            </span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <p
      key={idx}
      className={`max-w-full break-words text-sm leading-relaxed whitespace-normal sm:text-base ${
        zenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'
      }`}
      style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}
    >
      {b.text}
    </p>
  )
}

interface AboutSectionProps {
  /** When true, skip the outer card/header (for use inside PageCard) */
  embedded?: boolean
  /** Dark Zenith-style presentation (used by /about full-bleed page). */
  variant?: 'default' | 'zenith'
}

const cardShell = (zenith: boolean) =>
  zenith
    ? 'w-full rounded-2xl border border-[color:var(--border-card)] bg-[color:var(--bg-card)] p-5 shadow-[var(--shadow-card)] sm:p-6'
    : 'w-full rounded-2xl border border-primary-100 bg-white/70 p-5 shadow-lg'

const AboutSection = ({ embedded, variant = 'default' }: AboutSectionProps) => {
  const isZenith = variant === 'zenith'

  const content = (
        <div className={embedded ? '' : 'px-4 sm:px-6 md:px-8 py-6 sm:py-8'}>
          {/* Main heading: full width end-to-end */}
          {mainTitleBlock && (
            <div className="mb-6 w-full max-w-full sm:mb-8">
              <div className="space-y-2">
                <h3
                  className={
                    isZenith
                      ? 'zenith-display bg-gradient-to-r from-[color:var(--accent-gold)] via-[color:var(--accent-amber)] to-[color:var(--accent-teal)] bg-clip-text text-center text-lg font-extrabold tracking-tight text-transparent sm:text-left sm:text-xl'
                      : 'text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent text-center sm:text-left'
                  }
                >
                  {mainTitleBlock.text}
                </h3>
                <div
                  className={
                    isZenith
                      ? 'mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-[color:var(--accent-gold)] to-[color:var(--accent-teal)] sm:mx-0'
                      : 'h-1 w-24 rounded-full bg-gradient-to-r from-primary-600 to-yellow-500 mx-auto sm:mx-0'
                  }
                />
              </div>
            </div>
          )}

          {/* All cards stacked with consistent gap-6 */}
          <div className="flex w-full max-w-full flex-col gap-6">
            {/* Quick Summary */}
            <div className={cardShell(isZenith)}>
              <h4
                className={
                  isZenith
                    ? 'zenith-display mb-3 bg-gradient-to-r from-[color:var(--accent-teal)] to-[color:var(--accent-blue)] bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg'
                    : 'mb-3 text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent'
                }
              >
                Quick Summary
              </h4>
              <div
                className={`space-y-2 text-sm sm:text-base ${isZenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'}`}
              >
                <p>
                  This CRM platform is a custom-built internal system for Rayenna Energy Private Limited, with original workflows, architecture, and UI/UX.
                </p>
                <p>
                  The software and its components are protected by applicable intellectual property and software protection laws.
                </p>
                <p className={isZenith ? 'font-semibold text-[color:var(--accent-gold)]' : 'font-semibold text-gray-800'}>
                  Unauthorized use, distribution, or disclosure is prohibited.
                </p>
              </div>
            </div>

            {/* Title Credits */}
            <div className={cardShell(isZenith)}>
              <h4
                className={
                  isZenith
                    ? 'zenith-display mb-4 bg-gradient-to-r from-[color:var(--accent-gold)] to-[color:var(--accent-amber)] bg-clip-text text-base font-bold tracking-tight text-transparent sm:text-lg'
                    : 'mb-4 text-base sm:text-lg font-bold bg-gradient-to-r from-primary-600 to-amber-500 bg-clip-text text-transparent'
                }
              >
                Title Credits
              </h4>
              <div
                className={`space-y-4 text-sm sm:text-base ${isZenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'}`}
              >
                {titleCreditsBlocks.map((b, i) => renderBlock(b, (mainTitleBlock ? 2 : 1) + i, isZenith))}
              </div>
            </div>

            {/* Rayenna Identity */}
            <div
              className={
                isZenith ? cardShell(true) : `${cardShell(false)} bg-gradient-to-br from-white to-primary-50/40`
              }
            >
              <h4
                className={
                  isZenith
                    ? 'zenith-display mb-3 text-base font-bold tracking-tight text-transparent sm:text-lg bg-gradient-to-r from-[#c4b5fd] to-[#f472b6] bg-clip-text'
                    : 'mb-3 text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent'
                }
              >
                Rayenna Identity
              </h4>
              <p className={`text-sm leading-relaxed sm:text-base ${isZenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'}`}>
                Rayenna Energy is a solar EPC focused on quality execution, compliant subsidy handling, and reliable operations. This platform supports end-to-end delivery across Sales, Operations, and Finance.
              </p>
            </div>

            {/* Content section cards: Development Background through Confidentiality Notice */}
            {contentSections.map((section, sectionIdx) => {
                const gradient = isZenith
                  ? SECTION_HEADING_GRADIENTS_ZENITH[sectionIdx % SECTION_HEADING_GRADIENTS_ZENITH.length]
                  : SECTION_HEADING_GRADIENTS[sectionIdx % SECTION_HEADING_GRADIENTS.length]
                const contentBlocks = section.blocks.slice(1) // Skip heading (used as card title)
                return (
                  <div key={section.heading} className={cardShell(isZenith)}>
                    <h4
                      className={`mb-4 text-base font-bold sm:text-lg ${
                        isZenith
                          ? `zenith-display tracking-tight text-transparent bg-gradient-to-r ${gradient} bg-clip-text`
                          : `bg-gradient-to-r ${gradient} bg-clip-text text-transparent`
                      }`}
                    >
                      {section.heading}
                    </h4>
                    <div
                      className={`space-y-4 text-sm sm:text-base ${isZenith ? 'text-[color:var(--text-secondary)]' : 'text-gray-700'}`}
                    >
                      {contentBlocks.map((b, i) => renderBlock(b, section.startIdx + 1 + i, isZenith))}
                    </div>
                  </div>
                )
              })}
          </div>

          <div className={`mt-8 border-t pt-8 ${isZenith ? 'border-[color:var(--border-default)]' : 'border-primary-100'}`}>
            <div className="flex flex-col items-center">
              <img
                src="/CRM_Logo.jpg"
                alt="Rayenna CRM"
                className={`h-auto w-full max-w-[260px] object-contain sm:max-w-[320px] drop-shadow-2xl`}
              />
              <p
                className={`mt-3 text-center text-xs sm:text-sm ${isZenith ? 'text-[color:var(--text-muted)]' : 'text-gray-500'}`}
              >
                ©2026 – Present. Rayenna Energy Private Limited<br />
                www.rayenna.energy | sales@rayenna.energy
              </p>
            </div>
          </div>
        </div>
  )

  if (embedded) {
    return <section aria-label="About">{content}</section>
  }

  return (
    <section aria-label="About" className="mt-10">
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-primary-100 bg-gradient-to-r from-primary-600 via-primary-500 to-yellow-500">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20 border border-white/30 backdrop-blur-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
              About
            </h2>
          </div>
          <p className="mt-2 text-white text-sm sm:text-base opacity-90">
            Credits, copyright, intellectual property, and confidentiality notice
          </p>
        </div>
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          {content}
        </div>
      </div>
    </section>
  )
}

export default AboutSection

