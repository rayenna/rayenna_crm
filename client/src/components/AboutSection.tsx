
type Block =
  | { type: 'title'; text: string }
  | { type: 'subtitle'; text: string }
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
  'SHABEER MOHAMED KOZHAKKANIYIL',
  'Director, Rayenna Energy Private Limited',
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
      // First non-empty line becomes main title, subsequent stand-alone become subtitle
      const kind: Block['type'] = blocks.length === 0 ? 'title' : 'subtitle'
      blocks.push({ type: kind, text: line.trim() } as Block)
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

const AboutSection = () => {
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
          <p className="mt-2 text-white/90 text-sm sm:text-base">
            Credits, copyright, intellectual property, and confidentiality notice
          </p>
        </div>

        <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5 min-w-0 max-w-full overflow-hidden">
              {blocks.map((b, idx) => {
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
                  return (
                    <h4 key={idx} className="text-base sm:text-lg font-bold text-gray-900">
                      {b.text}
                    </h4>
                  )
                }
                if (b.type === 'bullets') {
                  return (
                    <ul key={idx} className="space-y-2">
                      {b.items.map((it, j) => (
                        <li key={j} className="flex gap-3">
                          <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-yellow-500 text-white text-xs shadow">
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
              })}
            </div>

            <div className="space-y-5">
              <div className="p-5 rounded-2xl border border-primary-100 bg-white/70 shadow-lg">
                <h4 className="text-base sm:text-lg font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                  Quick Summary
                </h4>
                <div className="space-y-2 text-sm sm:text-base text-gray-700">
                  <p>
                    This CRM platform is a custom-built internal system for Rayenna Energy Private Limited, with original workflows, architecture, and UI/UX.
                  </p>
                  <p>
                    The software and its components are protected by applicable intellectual property and software protection laws.
                  </p>
                  <p className="font-semibold text-gray-800">
                    Unauthorized use, distribution, or disclosure is prohibited.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-primary-100 bg-gradient-to-br from-white to-primary-50/40 shadow-lg">
                <h4 className="text-base sm:text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                  Rayenna Identity
                </h4>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                  Rayenna Energy is a solar EPC focused on quality execution, compliant subsidy handling, and reliable operations. This platform supports end-to-end delivery across Sales, Operations, and Finance.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-primary-100">
            <div className="flex flex-col items-center">
              <img
                src="/rayenna_logo.jpg"
                alt="Rayenna Energy Logo"
                className="w-full max-w-[224px] sm:max-w-[288px] h-auto drop-shadow-2xl"
              />
              <p className="mt-3 text-xs sm:text-sm text-gray-500 text-center">
                ©2026 – Present. Rayenna Energy Private Limited<br />
                www.rayenna.energy | sales@rayenna.energy
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutSection

