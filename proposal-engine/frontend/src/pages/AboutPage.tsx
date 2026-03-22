/**
 * About Page — Proposal Engine
 * Mirrors the structure, colour theme, and look & feel of the CRM's About page
 * (client/src/components/AboutSection.tsx + client/src/pages/About.tsx).
 */

/* ─── Block types ────────────────────────────────────────────────────────── */
type Block =
  | { type: 'title';    text: string }
  | { type: 'subtitle'; text: string }
  | { type: 'label';    text: string }
  | { type: 'bullets';  items: string[] }
  | { type: 'paragraph'; text: string }

/* ─── Raw content ────────────────────────────────────────────────────────── */
const RAW_LINES: string[] = [
  'Rayenna Energy CRM - Proposal Engine Module',
  '',
  'Title Credits',
  '',
  'Product Name: Proposal Engine Module',
  'Product Category: Custom CPQ Module for Solar EPC',
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
  'This Proposal Engine was custom-designed and developed specifically for the operational needs of Rayenna Energy Private Limited.',
  'Initial workflows and data structures were informed by the Company\'s internal cadence, Costing Sheets, BOM and Proposal formats. The software implementation, system architecture, logic, design patterns, and user experience represent original work independently conceived and executed by the developer.',
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
  'The Proposal Engine is an original work of authorship created by SHABEER MOHAMED KOZHAKKANIYIL. Any novel methods, processes, workflows, or system designs embodied in this software may constitute proprietary inventions and are subject to protection under applicable intellectual property laws, including but not limited to patent laws, where applicable.',
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

/* ─── Parser (identical logic to CRM's AboutSection) ────────────────────── */
function isSectionTitle(line: string, nextLine: string | undefined): boolean {
  if (!line.trim()) return false
  if (line.trim().startsWith('#')) return false
  return (nextLine ?? '').trim() === ''
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const next = lines[i + 1]

    if (!line.trim()) { i += 1; continue }

    if (line.trim().startsWith('#')) {
      const items: string[] = []
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('#')) {
        items.push((lines[i] ?? '').trim().replace(/^#\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'bullets', items })
      continue
    }

    if (isSectionTitle(line, next)) {
      if (line.trim().endsWith(':')) {
        blocks.push({ type: 'label', text: line.trim() })
      } else {
        const kind: Block['type'] = blocks.length === 0 ? 'title' : 'subtitle'
        blocks.push({ type: kind, text: line.trim() } as Block)
      }
      i += 1
      continue
    }

    const paraLines: string[] = []
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !(lines[i] ?? '').trim().startsWith('#')
    ) {
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

const CONTENT_SECTION_HEADINGS = new Set([
  'Authorship & Inventorship Declaration',
  'Ownership & Assignment Clarification',
  'Restrictions',
  'Confidentiality Notice',
])
const NORMAL_WEIGHT_SUBTITLES = new Set([
  'is protected under applicable copyright, intellectual property, and software protection laws.',
])

const authorshipBlockIndex = blocks.findIndex(
  (b) => b.type === 'subtitle' && b.text === 'Authorship & Inventorship Declaration',
)
const devBgBlockIndex = blocks.findIndex(
  (b) => b.type === 'subtitle' && b.text === 'Development Background',
)
const blocksBeforeDevBg   = devBgBlockIndex >= 0 ? blocks.slice(0, devBgBlockIndex) : blocks
const mainTitleBlock      = blocksBeforeDevBg[0]?.type === 'title' ? blocksBeforeDevBg[0] : null
const titleCreditsBlocksRaw = mainTitleBlock ? blocksBeforeDevBg.slice(1) : blocksBeforeDevBg
const titleCreditsBlocks  = titleCreditsBlocksRaw.filter(
  (b) => !(b.type === 'subtitle' && b.text === 'Title Credits'),
)
const blocksFromDevBg = devBgBlockIndex >= 0 ? blocks.slice(devBgBlockIndex) : []

const CONTENT_SECTION_ORDER = [
  'Development Background',
  'Intellectual Property & Copyright Notice',
  'Authorship & Inventorship Declaration',
  'Ownership & Assignment Clarification',
  'Restrictions',
  'Confidentiality Notice',
]
const contentSectionSet = new Set(CONTENT_SECTION_ORDER)

function splitIntoSections(
  blks: Block[],
): { heading: string; blocks: Block[]; startIdx: number }[] {
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

const SECTION_HEADING_GRADIENTS = [
  'from-primary-600 to-amber-500',
  'from-indigo-600 to-cyan-600',
  'from-purple-600 to-pink-600',
  'from-primary-600 to-cyan-600',
  'from-amber-600 to-orange-500',
  'from-violet-600 to-fuchsia-500',
]

/* ─── Block renderer ─────────────────────────────────────────────────────── */
function renderBlock(b: Block, idx: number) {
  if (b.type === 'title') {
    return (
      <div key={idx} className="space-y-2">
        <h3 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent">
          {b.text}
        </h3>
        <div className="h-1 w-24 rounded-full bg-gradient-to-r from-primary-600 to-yellow-500" />
      </div>
    )
  }
  if (b.type === 'subtitle') {
    const inContentSection = authorshipBlockIndex >= 0 && idx >= authorshipBlockIndex
    const isNormalWeight   = NORMAL_WEIGHT_SUBTITLES.has(b.text)
    const isBold           = !isNormalWeight && (!inContentSection || CONTENT_SECTION_HEADINGS.has(b.text))
    return (
      <h4 key={idx} className={`text-base sm:text-lg ${isBold ? 'font-bold' : 'font-normal'} text-gray-900`}>
        {b.text}
      </h4>
    )
  }
  if (b.type === 'label') {
    return (
      <p key={idx} className="text-sm sm:text-base text-gray-700 font-normal">
        {b.text}
      </p>
    )
  }
  if (b.type === 'bullets') {
    return (
      <ul key={idx} className="space-y-2">
        {b.items.map((it, j) => (
          <li key={j} className="flex gap-3">
            <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-yellow-500 text-white text-xs shadow">
              ✓
            </span>
            <span
              className="text-sm sm:text-base text-gray-700 leading-relaxed break-words whitespace-normal max-w-full"
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
      className="text-sm sm:text-base text-gray-700 leading-relaxed break-words whitespace-normal max-w-full"
      style={{ wordBreak: 'break-word', overflowWrap: 'break-word', hyphens: 'auto' }}
    >
      {b.text}
    </p>
  )
}

/* ─── Page component ─────────────────────────────────────────────────────── */
export default function AboutPage() {
  return (
    <div className="px-0">
      {/* Outer card — matches CRM's PageCard gradient header; no extra vertical padding here so gap under global nav matches Dashboard / Customers (Layout main supplies py-4 sm:py-6). */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">

        {/* Header */}
        <div
          className="px-6 py-5 sm:px-8 sm:py-6 border-b border-primary-100"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md">
              <svg className="w-5 h-5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">About</h1>
              <p className="text-white/80 text-xs sm:text-sm mt-0.5">
                Credits, copyright, intellectual property, and confidentiality notice
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

          {/* Main title */}
          {mainTitleBlock && (
            <div className="w-full max-w-full mb-6 sm:mb-8">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-600 bg-clip-text text-transparent text-center sm:text-left">
                  {mainTitleBlock.text}
                </h3>
                <div className="h-1 w-24 rounded-full bg-gradient-to-r from-primary-600 to-yellow-500 mx-auto sm:mx-0" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6 w-full max-w-full">

            {/* Quick Summary */}
            <div className="p-5 rounded-2xl border border-primary-100 bg-white/70 shadow-lg w-full">
              <h4 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                Quick Summary
              </h4>
              <div className="space-y-2 text-sm sm:text-base text-gray-700">
                <p>
                  This Proposal Engine is a custom-built CPQ module for Rayenna Energy Private Limited, with original workflows, architecture, and UI/UX designed specifically for solar EPC project proposals.
                </p>
                <p>
                  The software and its components are protected by applicable intellectual property and software protection laws.
                </p>
                <p className="font-semibold text-gray-800">
                  Unauthorized use, distribution, or disclosure is prohibited.
                </p>
              </div>
            </div>

            {/* Title Credits */}
            <div className="p-5 rounded-2xl border border-primary-100 bg-white/70 shadow-lg w-full">
              <h4 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary-600 to-amber-500 bg-clip-text text-transparent mb-4">
                Title Credits
              </h4>
              <div className="space-y-4 text-sm sm:text-base text-gray-700">
                {titleCreditsBlocks.map((b, i) => renderBlock(b, (mainTitleBlock ? 2 : 1) + i))}
              </div>
            </div>

            {/* Rayenna Identity */}
            <div className="p-5 rounded-2xl border border-primary-100 bg-gradient-to-br from-white to-primary-50/40 shadow-lg w-full">
              <h4 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                Rayenna Identity
              </h4>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                Rayenna Energy is a solar EPC focused on quality execution, compliant subsidy handling, and reliable operations. The Proposal Engine supports the full pre-sales workflow — from costing and BOM to ROI analysis and professional proposal generation.
              </p>
            </div>

            {/* Content section cards */}
            {contentSections.map((section, sectionIdx) => {
              const gradient      = SECTION_HEADING_GRADIENTS[sectionIdx % SECTION_HEADING_GRADIENTS.length]
              const contentBlocks = section.blocks.slice(1)
              return (
                <div
                  key={section.heading}
                  className="p-5 rounded-2xl border border-primary-100 bg-white/70 shadow-lg w-full"
                >
                  <h4 className={`text-base sm:text-lg font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent mb-4`}>
                    {section.heading}
                  </h4>
                  <div className="space-y-4 text-sm sm:text-base text-gray-700">
                    {contentBlocks.map((b, i) => renderBlock(b, section.startIdx + 1 + i))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-primary-100">
            <div className="flex flex-col items-center">
              <img
                src="/Proposals_Logo.jpg"
                alt="Proposal Engine"
                className="w-full max-w-[260px] sm:max-w-[320px] h-auto object-contain drop-shadow-2xl"
              />
              <p className="mt-3 text-xs sm:text-sm text-gray-500 text-center">
                ©2026 – Present. Rayenna Energy Private Limited<br />
                www.rayennaenergy.com | sales@rayenna.energy
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
