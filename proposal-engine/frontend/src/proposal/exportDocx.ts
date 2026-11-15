import { CATEGORIES } from '../lib/costingConstants';
import type { ProposalCustomSectionBeforeBoq } from '../lib/customerStore';
import { formatEmailForDisplay } from '../lib/customerStore';
import { proposalCustomSectionsToDocxBlocks } from '../lib/proposalCustomSectionsDocx';
import type { AiRoofLayoutResponse } from '../lib/apiClient';
import { fmtINR, fmtINRFull } from './format';
import {
  ABOUT_HIGHLIGHTS,
  DELIVERY_TERMS,
  OUR_PROCESS_INTRO,
  OUR_PROCESS_STEPS,
  OUR_SERVICES,
  SERVICE_DETAILS,
  SUBSIDY_DISCLAIMER_TEXT,
  TERMS_AND_CONDITIONS,
  WHAT_WE_OFFER_INTRO,
  closingText,
  savingsText,
  scopeText,
} from './proposalCopy';
import {
  buildCommercialsWaterfall,
  buildTechDetailCards,
  buildWarrantyRows,
  resolveAuthorityFees,
  resolveExclusions,
  resolveKeyPoints,
  resolveOfferValidity,
  resolvePaymentMilestones,
  resolveRaciRows,
  subsidyCreditNote,
  techDetailsFootnote,
} from './proposalContent';
import { proposalDisplayCapacityKw } from './proposalAssembly';
import {
  proposalForHeading,
  rewriteSystemTypeInOverrides,
  systemTypeArticle,
  systemTypeCapacityChip,
  systemTypeHeadingTerm,
} from './systemTypeLabel';
import { isOptionalSectionIncluded, type IncludedOptionalSections } from './optionalSections';
import { ov, resolveScopeSectionsForExport } from './textOverridesApply';
import type { DocxModule, DocxTableRow, ProposalData, TextOverrides } from './types';

export function buildDocx(
  p: ProposalData,
  diagramImageData?: ArrayBuffer,
  bomComments?: Record<string, string>,
  logoImageData?: ArrayBuffer,
  textOverrides?: TextOverrides,
  roofLayout?: AiRoofLayoutResponse | null,
  roofLayoutImageData?: ArrayBuffer,
  customSectionsBeforeBoq?: ProposalCustomSectionBeforeBoq[],
  customSectionPostersById?: Record<string, ArrayBuffer | undefined>,
  docx?: DocxModule,
  includedOptionalSections?: IncludedOptionalSections | null,
  /** Composited cover hero (navy wash) for the DOCX title banner. */
  coverHeroImageData?: ArrayBuffer,
): import('docx').Document {
  if (!docx) {
    throw new Error('DOCX export module not loaded.');
  }
  // Defense in depth: stale saved edits must not reintroduce a wrong system type.
  textOverrides = textOverrides
    ? rewriteSystemTypeInOverrides(textOverrides, p.systemType)
    : textOverrides;
  const opt = (id: Parameters<typeof isOptionalSectionIncluded>[0]) =>
    isOptionalSectionIncluded(id, includedOptionalSections);
  const {
    Document,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    TextRun,
    HeadingLevel,
    AlignmentType,
    WidthType,
    BorderStyle,
    ShadingType,
    ImageRun,
    Header,
    Footer,
  } = docx;

  const navy  = '0d1b3a';
  const white = 'FFFFFF';

  const heading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C7D2FE', space: 4 } },
    });

  const multilineParagraphs = (text: string) =>
    text.split('\n').map((line) =>
      new Paragraph({
        children: [new TextRun({ text: line, size: 22, color: '374151' })],
        spacing: { after: 80 },
      }),
    );

  const listItem = (text: string, num?: number) =>
    new Paragraph({
      children: [
        new TextRun({ text: num != null ? `${num}. ` : '• ', bold: true, size: 22, color: navy }),
        new TextRun({ text, size: 22, color: '374151' }),
      ],
      spacing: { after: 80 },
      indent: { left: 360 },
    });

  // Title-page wallpaper banner (Word cannot layer CSS under text like PDF/PPT).
  const coverBanner = coverHeroImageData
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [
            new ImageRun({
              data: coverHeroImageData,
              transformation: { width: 650, height: 366 },
              type: 'jpg',
            }),
          ],
        }),
      ]
    : [];

  // ── Letterhead ──
  const letterhead = [
    // Header: logo (right) + company details (left) in a 2-col navy table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: navy },
        bottom: { style: BorderStyle.NONE, size: 0, color: navy },
        left:   { style: BorderStyle.NONE, size: 0, color: navy },
        right:  { style: BorderStyle.NONE, size: 0, color: navy },
      },
      rows: [
        new TableRow({
          children: [
            // Left cell: company name + address
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: navy },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: navy },
                bottom: { style: BorderStyle.NONE, size: 0, color: navy },
                left:   { style: BorderStyle.NONE, size: 0, color: navy },
                right:  { style: BorderStyle.NONE, size: 0, color: navy },
              },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'RAYENNA ENERGY PRIVATE LIMITED', bold: true, size: 30, color: white })],
                  spacing: { before: 120, after: 60 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Door No. 3329/52, Ray Bhavan, NH Bypass, Thykoodam, Kochi - 682019', size: 17, color: 'C7D2FE' })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'Tel: +91 7907 369 304  |  sales@rayenna.energy', size: 16, color: '93C5FD' })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: 'www.rayennaenergy.com  |  GST: 32AANCR8677A1Z6', size: 16, color: '93C5FD' })],
                  spacing: { after: 120 },
                }),
              ],
            }),
            // Right cell: logo image
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: white },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: white },
                bottom: { style: BorderStyle.NONE, size: 0, color: white },
                left:   { style: BorderStyle.NONE, size: 0, color: white },
                right:  { style: BorderStyle.NONE, size: 0, color: white },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60, after: 60 },
                  children: logoImageData
                    ? [new ImageRun({ data: logoImageData, transformation: { width: 130, height: 100 }, type: 'jpg' })]
                    : [new TextRun({ text: 'RAYENNA ENERGY', bold: true, size: 22, color: navy })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
    new Paragraph({
      children: [
        new TextRun({ text: `Ref: ${p.refNumber}`, bold: true, size: 22, color: navy }),
        new TextRun({ text: `        Date: ${new Date(p.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, size: 22, color: '374151' }),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'To,', bold: true, size: 22, color: navy })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: p.customer.customerName, bold: true, size: 26, color: navy })],
      spacing: { after: 40 },
    }),
    ...(p.customer.contactPerson ? [new Paragraph({ children: [new TextRun({ text: `Attn: ${p.customer.contactPerson}`, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.location     ? [new Paragraph({ children: [new TextRun({ text: p.customer.location, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.phone        ? [new Paragraph({ children: [new TextRun({ text: `Ph: ${p.customer.phone}`, size: 22, color: '374151' })], spacing: { after: 40 } })] : []),
    ...(p.customer.email        ? [new Paragraph({ children: [new TextRun({ text: `Email: ${formatEmailForDisplay(p.customer.email)}`, size: 22, color: '374151' })], spacing: { after: 200 } })] : []),
    new Paragraph({
      children: [
        new TextRun({ text: `Proposal For: ${proposalForHeading(proposalDisplayCapacityKw(p), p.systemType)}`, bold: true, size: 28, color: navy }),
      ],
      spacing: { after: 80 },
    }),
    ...(proposalDisplayCapacityKw(p) > 0
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: `System capacity: ${proposalDisplayCapacityKw(p)} kW`,
                bold: true,
                size: 22,
                color: 'B45309',
              }),
            ],
            spacing: { after: 80 },
          }),
        ]
      : []),
    ...((p.projectNumber != null || p.customerNumber)
      ? [
          new Paragraph({
            children: [
              new TextRun({
                text: [
                  p.projectNumber != null ? `Project #${p.projectNumber}` : '',
                  p.customerNumber ? `Customer #${p.customerNumber}` : '',
                ]
                  .filter(Boolean)
                  .join(' · '),
                size: 18,
                color: '64748B',
              }),
            ],
            spacing: { after: 280 },
          }),
        ]
      : [new Paragraph({ text: '', spacing: { after: 280 } })]),
  ];

  // ── ROI KPIs ──
  const roiSection = p.roi ? (() => {
    const r = p.roi!;
    const rows = r.yearlyBreakdown ?? [];

    // KPI summary table
    const kpiTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ['Annual Generation', 'Year-1 Savings', 'Payback Period', '25-Year Savings', 'ROI', 'CO₂ Offset'].map((label) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: white })], alignment: AlignmentType.CENTER })],
              shading: { type: ShadingType.SOLID, color: navy },
            }),
          ),
        }),
        new TableRow({
          children: [
            `${r.annualGeneration.toLocaleString('en-IN')} kWh`,
            fmtINR(r.annualSavings),
            `${r.paybackYears.toFixed(1)} yrs`,
            fmtINR(r.totalSavings25Years),
            `${r.roiPercent.toFixed(1)}%`,
            `${r.co2OffsetTons.toFixed(1)} T`,
          ].map((val) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: val, bold: true, size: 22, color: navy })], alignment: AlignmentType.CENTER })],
            }),
          ),
        }),
      ],
    });

    // 25-year breakdown table (only if data available)
    const breakdownTable = rows.length > 0 ? new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Header
        new TableRow({
          children: ['Year', 'Generation (kWh)', 'Tariff (₹/kWh)', 'Annual Savings', 'Cumulative Savings', 'Status'].map((h) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 16, color: white })], alignment: AlignmentType.CENTER })],
              shading: { type: ShadingType.SOLID, color: navy },
            }),
          ),
        }),
        // Data rows — first 6, ellipsis, last 2
        ...[...rows.slice(0, 6), null, ...rows.slice(-2)].map((row) => {
          // Ellipsis separator row
          if (row === null) return new TableRow({
            children: [new TableCell({
              columnSpan: 6,
              shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
              children: [new Paragraph({
                children: [new TextRun({ text: '· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·', size: 14, color: '94A3B8', italics: true })],
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 40 },
              })],
            })],
          });
          return new TableRow({
            children: [
              String(row.year),
              row.generation.toLocaleString('en-IN'),
              row.tariffRate.toFixed(2),
              fmtINR(row.savings),
              fmtINR(row.cumulativeSavings),
              row.paybackReached ? '✓ ROI' : 'Payback',
            ].map((val, ci) =>
              new TableCell({
                shading: row.paybackReached ? { type: ShadingType.SOLID, color: 'EFF6FF' } : undefined,
                children: [new Paragraph({
                  children: [new TextRun({
                    text: val,
                    size: 16,
                    bold: ci === 4 || ci === 0,
                    color: ci === 3 ? '059669' : ci === 4 ? navy : '374151',
                  })],
                  alignment: ci === 0 || ci === 5 ? AlignmentType.CENTER : ci >= 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                })],
              }),
            ),
          });
        }),
        // Total row
        new TableRow({
          children: [
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: '25-Year Total', bold: true, size: 18, color: white })] })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows.reduce((s, row) => s + row.savings, 0)), bold: true, size: 18, color: 'FCD34D' })], alignment: AlignmentType.RIGHT })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows[rows.length - 1]?.cumulativeSavings ?? 0), bold: true, size: 18, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })] }),
            new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ text: '' })] }),
          ],
        }),
      ],
    }) : null;

    // Side-by-side DOCX layout: chart description (left) + compact table (right)
    const sideBySide = breakdownTable ? new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      },
      rows: [new TableRow({
        children: [
          // Left cell — chart note + key stats
          new TableCell({
            width: { size: 42, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ children: [new TextRun({ text: '25-Year Savings Overview', bold: true, size: 20, color: navy })], spacing: { after: 120 } }),
              ...[
                ['Annual Generation', `${r.annualGeneration.toLocaleString('en-IN')} kWh`],
                ['Year-1 Savings', fmtINR(r.annualSavings)],
                ['Payback Period', `${r.paybackYears.toFixed(1)} years`],
                ['25-Year Savings', fmtINR(r.totalSavings25Years)],
                ['ROI', `${r.roiPercent.toFixed(1)}%`],
                ['CO₂ Offset', `${r.co2OffsetTons.toFixed(1)} tonnes`],
                ['LCOE', `₹${r.lcoe.toFixed(4)}/kWh`],
              ].map(([label, value]) =>
                new Paragraph({
                  children: [
                    new TextRun({ text: `${label}: `, size: 18, color: '6B7280' }),
                    new TextRun({ text: value, bold: true, size: 18, color: navy }),
                  ],
                  spacing: { after: 60 },
                }),
              ),
            ],
          }),
          // Right cell — compact savings table
          new TableCell({
            width: { size: 58, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'Year-by-Year Breakdown', bold: true, size: 20, color: navy })], spacing: { after: 80 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Header
                  new TableRow({
                    children: ['Yr', 'Annual Savings', 'Cumulative'].map((h) =>
                      new TableCell({
                        shading: { type: ShadingType.SOLID, color: navy },
                        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 14, color: white })], alignment: AlignmentType.CENTER })],
                      }),
                    ),
                  }),
                  // First 6 rows
                  ...rows.slice(0, 6).map((row) => new TableRow({
                    children: [
                      String(row.year), fmtINR(row.savings), fmtINR(row.cumulativeSavings),
                    ].map((val, ci) => new TableCell({
                      shading: row.paybackReached ? { type: ShadingType.SOLID, color: 'F0FDF4' } : undefined,
                      children: [new Paragraph({
                        children: [new TextRun({ text: val, size: 14, bold: ci === 2, color: ci === 1 ? '059669' : ci === 2 ? navy : '374151' })],
                        alignment: ci === 0 ? AlignmentType.CENTER : AlignmentType.RIGHT,
                      })],
                    })),
                  })),
                  // Ellipsis
                  new TableRow({
                    children: [new TableCell({
                      columnSpan: 3,
                      shading: { type: ShadingType.SOLID, color: 'F1F5F9' },
                      children: [new Paragraph({ children: [new TextRun({ text: '· · · · · · · · · · · · · · · · · · · · · · · ·', size: 12, color: '94A3B8', italics: true })], alignment: AlignmentType.CENTER })],
                    })],
                  }),
                  // Last 2 rows
                  ...rows.slice(-2).map((row) => new TableRow({
                    children: [
                      String(row.year), fmtINR(row.savings), fmtINR(row.cumulativeSavings),
                    ].map((val, ci) => new TableCell({
                      shading: { type: ShadingType.SOLID, color: 'EFF6FF' },
                      children: [new Paragraph({
                        children: [new TextRun({ text: val, size: 14, bold: ci === 2, color: ci === 1 ? '059669' : ci === 2 ? navy : '374151' })],
                        alignment: ci === 0 ? AlignmentType.CENTER : AlignmentType.RIGHT,
                      })],
                    })),
                  })),
                  // Total row
                  new TableRow({
                    children: [
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: 'Total', bold: true, size: 14, color: white })], alignment: AlignmentType.CENTER })] }),
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows.reduce((s, row) => s + row.savings, 0)), bold: true, size: 14, color: 'FCD34D' })], alignment: AlignmentType.RIGHT })] }),
                      new TableCell({ shading: { type: ShadingType.SOLID, color: navy }, children: [new Paragraph({ children: [new TextRun({ text: fmtINR(rows[rows.length - 1]?.cumulativeSavings ?? 0), bold: true, size: 14, color: 'FFFFFF' })], alignment: AlignmentType.RIGHT })] }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      })],
    }) : null;

    return [
      heading('Financial Highlights'),
      kpiTable,
      new Paragraph({ text: '', spacing: { after: 160 } }),
      ...(sideBySide ? [sideBySide, new Paragraph({ text: '', spacing: { after: 200 } })] : [new Paragraph({ text: '', spacing: { after: 200 } })]),
    ];
  })() : [];

  // ── BOM table ──
  // BOM grouped by category
  const bomSection = p.bom.length > 0 ? (() => {
    const grouped = CATEGORIES
      .map(({ value, label }) => ({ cat: value, label, rows: p.bom.filter((r) => r.category === value) }))
      .filter((g) => g.rows.length > 0);

    // Hex shading per category (light tones for Word)
    const catBg: Record<string, string> = {
      'pv-modules': 'E0F2FE', 'inverters': 'FEF9C3', 'mounting-structure': 'F1F5F9',
      'dc-db': 'FFEDD5', 'ac-db': 'FEE2E2', 'dc-cable': 'FEF3C7',
      'ac-cable': 'DCFCE7', 'earthing': 'D1FAE5', 'meter': 'EDE9FE',
      'installation': 'DBEAFE', 'others': 'F3F4F6',
    };
    const catFg: Record<string, string> = {
      'pv-modules': '0369a1', 'inverters': 'b45309', 'mounting-structure': '475569',
      'dc-db': 'c2410c', 'ac-db': 'b91c1c', 'dc-cable': 'd97706',
      'ac-cable': '16a34a', 'earthing': '059669', 'meter': '7c3aed',
      'installation': '1d4ed8', 'others': '4b5563',
    };
    const catIcons: Record<string, string> = {
      'pv-modules': '☀', 'inverters': '⚡', 'mounting-structure': '🔩',
      'dc-db': '▪', 'ac-db': '▪', 'dc-cable': '▪',
      'ac-cable': '▪', 'earthing': '▪', 'meter': '▪',
      'installation': '🔧', 'others': '▪',
    };

    let serial = 0;
    const tableRows: DocxTableRow[] = [
      // Column headers
      new TableRow({
        children: ['#', 'Item', 'Specification', 'Qty'].map((h, ci) =>
          new TableCell({
            width: ci === 0 ? { size: 5, type: WidthType.PERCENTAGE }
                 : ci === 3 ? { size: 10, type: WidthType.PERCENTAGE }
                 : undefined,
            shading: { type: ShadingType.SOLID, color: navy },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 18, color: white })], alignment: ci >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT })],
          }),
        ),
      }),
    ];

    grouped.forEach(({ cat, label, rows }) => {
      const bg   = catBg[cat]  ?? 'F3F4F6';
      const fg   = catFg[cat]  ?? '374151';
      const icon = catIcons[cat] ?? '▪';

      // Category header row
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: 4,
              shading: { type: ShadingType.SOLID, color: bg },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `${icon}  ${label.toUpperCase()}`, bold: true, size: 20, color: fg }),
                    new TextRun({ text: `   (${rows.length} item${rows.length !== 1 ? 's' : ''})`, size: 16, color: '9CA3AF' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );

      // Item rows
      rows.forEach((item) => {
        serial++;
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(serial), size: 18, color: '9CA3AF' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.itemName, size: 20, bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.specification || '—', size: 18, color: '6B7280' })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.quantity, size: 20 })], alignment: AlignmentType.RIGHT })] }),
            ],
          }),
        );
      });

      // Comment row (if any)
      const comment = bomComments?.[cat];
      if (comment) {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                columnSpan: 4,
                shading: { type: ShadingType.SOLID, color: bg },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: '📝 Note: ', bold: true, size: 18, color: fg }),
                      new TextRun({ text: comment, size: 18, italics: true, color: '374151' }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        );
      }
    });

    return [
      heading('Bill of Quantities'),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
      new Paragraph({ text: '', spacing: { after: 200 } }),
    ];
  })() : [];

  const customBeforeBoqDocx = proposalCustomSectionsToDocxBlocks(
    customSectionsBeforeBoq,
    customSectionPostersById,
    docx,
  );

  // ── Technical details + Commercials waterfall ──
  const techCards = buildTechDetailCards(p, textOverrides, bomComments);
  const techDetailsSection = techCards.length
    ? [
        heading('Technical Details'),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Major components proposed for this installation. Full quantities and notes follow in the Bill of Quantities.',
              size: 20,
              color: '64748B',
            }),
          ],
          spacing: { after: 120 },
        }),
        ...techCards.flatMap((c) => [
          new Paragraph({
            children: [new TextRun({ text: c.title.toUpperCase(), bold: true, size: 20, color: navy })],
            spacing: { before: 80, after: 40 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Manufacturer: ${c.manufacturer}`, size: 18, color: '374151' }),
            ],
            spacing: { after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Type / rating: ${c.typeRating}`, size: 18, color: '374151' })],
            spacing: { after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Quantity: ${c.quantity}`, size: 18, color: '374151' })],
            spacing: { after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Specification: ${c.specification}`, size: 18, color: '374151' })],
            spacing: { after: 20 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Warranty: ${c.warranty}`, size: 18, color: '374151' })],
            spacing: { after: 80 },
          }),
        ]),
        new Paragraph({
          children: [
            new TextRun({
              text: techDetailsFootnote(textOverrides),
              size: 16,
              color: 'B91C1C',
              italics: true,
            }),
          ],
          spacing: { after: 160 },
        }),
      ]
    : [];

  const waterfall = buildCommercialsWaterfall(p, textOverrides);
  const commercialsSection = waterfall
    ? (() => {
        const commercialRows: DocxTableRow[] = [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: waterfall.description, size: 20 })],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: fmtINRFull(waterfall.preGst), bold: true, size: 20 })],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                width: { size: 22, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: waterfall.gstLabel, size: 20, color: '1D4ED8' })],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: fmtINRFull(waterfall.gstAmount), bold: true, size: 20, color: '1D4ED8' }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'Total project cost (incl. GST)', bold: true, size: 20 }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: fmtINRFull(waterfall.grandRounded), bold: true, size: 20 }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          }),
        ];
        if (waterfall.showSubsidy) {
          commercialRows.push(
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: 'Subsidy eligible', size: 20, color: '92400E' })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `(−) ${fmtINRFull(waterfall.subsidyAmt)}`,
                          bold: true,
                          size: 20,
                          color: '92400E',
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: 'Effective price after subsidy', bold: true, size: 20, color: '065F46' }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: fmtINRFull(waterfall.effectiveAfterSubsidy),
                          bold: true,
                          size: 20,
                          color: '065F46',
                        }),
                      ],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
          );
        }
        commercialRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'PAYABLE TO RAYENNA ENERGY', bold: true, size: 22, color: white }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
                shading: { type: ShadingType.SOLID, color: navy },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: fmtINRFull(waterfall.payableToRayenna),
                        bold: true,
                        size: 24,
                        color: white,
                      }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                shading: { type: ShadingType.SOLID, color: navy },
              }),
            ],
          }),
        );

        const feeRows = resolveAuthorityFees(waterfall.sizeKw, textOverrides).map(
          (fee) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: fee.label, size: 18 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: fee.amountLabel, size: 18 })],
                      alignment: AlignmentType.RIGHT,
                    }),
                  ],
                }),
              ],
            }),
        );

        return [
          heading('Commercials'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: commercialRows,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `In words (payable): ${waterfall.payableInWords}`,
                size: 18,
                italics: true,
                color: '475569',
              }),
            ],
            spacing: { before: 80, after: 40 },
          }),
          ...(waterfall.showSubsidy
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `In words (effective after subsidy): ${waterfall.effectiveInWords}`,
                      size: 18,
                      italics: true,
                      color: '475569',
                    }),
                  ],
                  spacing: { after: 40 },
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: subsidyCreditNote(textOverrides), size: 16, color: '92400E' }),
            ],
            spacing: { after: 120 },
          }),
          heading('Authority / DISCOM Fees'),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: feeRows,
          }),
          new Paragraph({ text: '', spacing: { after: 160 } }),
        ];
      })()
    : [];

  const raciRows = resolveRaciRows(textOverrides);
  const raciSection = [
    heading('Responsibility Matrix'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ['#', 'Description', 'Rayenna', 'Client'].map(
            (label) =>
              new TableCell({
                shading: { type: ShadingType.SOLID, color: navy },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 16, color: white })],
                  }),
                ],
              }),
          ),
        }),
        ...raciRows.map(
          (r, i) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: String(i + 1), size: 16 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: r.description, size: 16 })],
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: r.rayenna ? 'Yes' : '—', size: 16 })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: r.client ? 'Yes' : '—', size: 16 })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                }),
              ],
            }),
        ),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];

  const paymentMilestones = resolvePaymentMilestones(textOverrides);
  const paymentSection = [
    heading('Payment Terms'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: ['%', 'Milestone'].map(
            (label) =>
              new TableCell({
                shading: { type: ShadingType.SOLID, color: 'B45309' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 16, color: white })],
                  }),
                ],
              }),
          ),
        }),
        ...paymentMilestones.map(
          (m) =>
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: `${m.percent}%`, bold: true, size: 18 })],
                    }),
                  ],
                  width: { size: 15, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: m.trigger, size: 18 })],
                    }),
                  ],
                }),
              ],
            }),
        ),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
  ];

  const warrantyRows = buildWarrantyRows(p, textOverrides, bomComments);
  const warrantySection = [
    heading('Warranty'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: warrantyRows.map(
        (r) =>
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: r.label, bold: true, size: 18 })],
                  }),
                ],
                width: { size: 32, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: r.detail, size: 18 })],
                  }),
                ],
              }),
            ],
          }),
      ),
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
  ];

  const sections = [
    ...coverBanner,
    ...letterhead,
    heading('Executive Summary'),
    // Greeting shaded box
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '0d1b3a' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'PREPARED EXCLUSIVELY FOR', size: 16, color: 'AABBCC', bold: true })],
                  spacing: { after: 40 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: p.customer.customerName || 'Valued Customer', size: 28, bold: true, color: 'FFFFFF' })],
                  spacing: { after: p.customer.location ? 40 : 0 },
                }),
                ...(p.customer.location ? [new Paragraph({
                  children: [new TextRun({ text: p.customer.location, size: 18, color: '8899AA' })],
                })] : []),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    // Body paragraphs — use DOM-extracted text if user has edited inline
    (() => {
      const sz  = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      const loc = p.customer.location;
      const override = textOverrides?.['exec-summary-p1'];
      if (override) {
        return new Paragraph({
          children: [new TextRun({ text: override, size: 22, color: '374151' })],
          spacing: { after: 120 },
        });
      }
      const typeTerm = systemTypeHeadingTerm(p.systemType);
      return new Paragraph({
        children: [
          new TextRun({ text: 'Rayenna Energy Private Limited is pleased to present this techno-commercial proposal for the design, supply, installation, and commissioning of', size: 22, color: '374151' }),
          ...(sz > 0
            ? [
                new TextRun({ text: ` a ${sz} kW`, bold: true, size: 22, color: navy }),
                new TextRun({ text: ` ${typeTerm}`, size: 22, color: '374151' }),
              ]
            : [
                new TextRun({ text: ` ${systemTypeArticle(p.systemType)} ${typeTerm}`, size: 22, color: '374151' }),
              ]),
          new TextRun({ text: ' Solar Photovoltaic Power Plant at your premises', size: 22, color: '374151' }),
          ...(loc ? [new TextRun({ text: ` in ${loc}`, bold: true, size: 22, color: navy })] : []),
          new TextRun({ text: '.', size: 22, color: '374151' }),
        ],
        spacing: { after: 120 },
      });
    })(),
    new Paragraph({
      children: [new TextRun({ text: textOverrides?.['exec-summary-p2'] ?? 'This proposal has been prepared based on a detailed assessment of your energy requirements and site conditions. The proposed solar system will significantly reduce your electricity costs, provide energy independence, and contribute to a cleaner environment.', size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    // Key metrics table (only if data available)
    ...(() => {
      const sz   = (p.roi?.inputs.systemSizeKw ?? 0) > 0 ? p.roi!.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      const cost = p.roiAutofill?.grandTotal ?? p.roi?.inputs.projectCost ?? 0;
      const pb   = p.roi?.paybackYears;
      const sav  = p.roi?.totalSavings25Years;
      const metrics = [
        ...(sz > 0   ? [{ label: 'System Capacity',   value: systemTypeCapacityChip(sz, p.systemType) }] : []),
        ...(cost > 0 ? [{ label: 'Project Investment', value: fmtINR(cost) }] : []),
        ...(pb       ? [{ label: 'Payback Period',     value: `~${pb.toFixed(1)} years` }] : []),
        ...(sav      ? [{ label: '25-Year Savings',    value: fmtINR(sav) }] : []),
      ];
      if (metrics.length === 0) return [];
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: metrics.map((m) => new TableCell({
                shading: { type: ShadingType.SOLID, color: 'EEF2FF' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: m.label, size: 16, color: '6B7280' })], spacing: { after: 30 } }),
                  new Paragraph({ children: [new TextRun({ text: m.value, size: 22, bold: true, color: navy })] }),
                ],
              })),
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 80 } }),
      ];
    })(),
    heading('About Rayenna Energy'),
    new Paragraph({
      children: textOverrides?.['about-p1']
        ? [new TextRun({ text: textOverrides['about-p1'], size: 22, color: '374151' })]
        : [
            new TextRun({ text: 'Rayenna Energy Private Limited', bold: true, size: 22, color: navy }),
            new TextRun({ text: ' is a leading solar energy solutions provider based in Kochi, Kerala. We specialise in the design, supply, installation, and commissioning of On-Grid, Off-Grid, and Hybrid Solar Power Plants for residential, commercial, and industrial clients across India.', size: 22, color: '374151' }),
          ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: textOverrides?.['about-p2'] ?? 'Our team of experienced engineers and technicians ensures that every installation meets the highest standards of quality, safety, and performance. We are committed to delivering reliable, cost-effective solar solutions that provide long-term value to our customers.', size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    // Key Highlights header row
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: '0369a1' },
              columnSpan: 2,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: 'KEY HIGHLIGHTS', bold: true, size: 18, color: 'FFFFFF' })],
                }),
              ],
            }),
          ],
        }),
        // 3 rows × 2 cols of highlights
        ...Array.from({ length: 3 }, (_, r) =>
          new TableRow({
            children: [0, 1].map((c) => {
              const idx = r * 2 + c;
              const h = ABOUT_HIGHLIGHTS[idx];
              const text = ov(textOverrides, `about-highlight-${idx}`, h.text);
              return new TableCell({
                shading: { type: ShadingType.SOLID, color: 'F0F9FF' },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${h.icon}  ${text}`, size: 20, color: '374151' })],
                  }),
                ],
              });
            }),
          })
        ),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    heading('What We Offer'),
    // Intro text + image side-by-side (2-col borderless table)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            // Left: intro text
            new TableCell({
              width: { size: 58, type: WidthType.PERCENTAGE },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              children: (textOverrides?.['what-we-offer-intro'] ?? WHAT_WE_OFFER_INTRO).split('\n\n').map((para: string) =>
                new Paragraph({
                  children: [new TextRun({ text: para, size: 22, color: '374151' })],
                  spacing: { after: 120 },
                })
              ),
            }),
            // Right: diagram image (if available)
            new TableCell({
              width: { size: 42, type: WidthType.PERCENTAGE },
              borders: {
                top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
                right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: diagramImageData ? [
                    new ImageRun({
                      data: diagramImageData,
                      transformation: { width: 240, height: 160 },
                      type: 'jpg',
                    }),
                  ] : [new TextRun({ text: '[Solar System Diagram]', size: 20, color: '9CA3AF', italics: true })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    // 3-service table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: OUR_SERVICES.map((s, i) => new TableCell({
            shading: { type: ShadingType.SOLID, color: 'E0F2FE' },
            children: [
              new Paragraph({
                children: [new TextRun({
                  text: `${s.icon}  ${ov(textOverrides, `offer-service-${i}-title`, s.title).toUpperCase()}`,
                  bold: true,
                  size: 20,
                  color: '0369a1',
                })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({
                  text: ov(textOverrides, `offer-service-${i}-desc`, s.desc),
                  size: 18,
                  color: '374151',
                })],
              }),
            ],
          })),
        }),
      ],
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    heading('Financial Benefits & Savings'),
    ...(p.roi ? (() => {
      const r      = p.roi!;
      const sizeKw = r.inputs.systemSizeKw > 0 ? r.inputs.systemSizeKw : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
      const heroOverride = textOverrides?.['financial-hero']?.trim();
      return [
        // Hero statement — prefer live Edit override when present
        heroOverride
          ? new Paragraph({
              children: [new TextRun({ text: heroOverride, size: 22, color: '374151' })],
              spacing: { after: 160 },
            })
          : new Paragraph({
              children: [
                new TextRun({ text: 'The proposed ', size: 22, color: '374151' }),
                new TextRun({ text: proposalForHeading(sizeKw, p.systemType), bold: true, size: 24, color: navy }),
                new TextRun({ text: ' is projected to generate ', size: 22, color: '374151' }),
                new TextRun({ text: `${r.annualGeneration.toLocaleString('en-IN')} kWh`, bold: true, size: 22, color: '059669' }),
                new TextRun({ text: ' of clean electricity in Year 1, delivering annual savings of ', size: 22, color: '374151' }),
                new TextRun({ text: fmtINR(r.annualSavings), bold: true, size: 22, color: '059669' }),
                new TextRun({ text: '. Over 25 years, cumulative savings are estimated at ', size: 22, color: '374151' }),
                new TextRun({ text: fmtINR(r.totalSavings25Years), bold: true, size: 24, color: navy }),
                new TextRun({ text: ` — an ROI of `, size: 22, color: '374151' }),
                new TextRun({ text: `${r.roiPercent.toFixed(1)}%`, bold: true, size: 24, color: navy }),
                new TextRun({ text: '.', size: 22, color: '374151' }),
              ],
              spacing: { after: 160 },
            }),
        // 4-column highlight table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                { label: 'Year-1 Generation', value: `${r.annualGeneration.toLocaleString('en-IN')} kWh`, sub: `${r.inputs.generationFactor} kWh/kW/yr` },
                { label: 'Year-1 Savings',    value: fmtINR(r.annualSavings),                             sub: `@ ₹${r.inputs.tariff}/kWh` },
                { label: '25-Year Savings',   value: fmtINR(r.totalSavings25Years),                       sub: `${r.inputs.escalationPercent}% escalation` },
                { label: 'Payback Period',    value: `${r.paybackYears.toFixed(1)} years`,                sub: 'simple payback' },
              ].map(({ label, value, sub }) => new TableCell({
                shading: { type: ShadingType.SOLID, color: 'F0FDF4' },
                children: [
                  new Paragraph({ children: [new TextRun({ text: label, size: 16, color: '6B7280', bold: false })], spacing: { after: 20 } }),
                  new Paragraph({ children: [new TextRun({ text: value, size: 22, bold: true, color: navy })], spacing: { after: 20 } }),
                  new Paragraph({ children: [new TextRun({ text: sub, size: 14, color: '9CA3AF', italics: true })] }),
                ],
              })),
            }),
          ],
        }),
        new Paragraph({ text: '', spacing: { after: 120 } }),
        // LCOE paragraph — use DOM override if available
        new Paragraph({
          children: textOverrides?.['financial-p1']
            ? [new TextRun({ text: textOverrides['financial-p1'], size: 22, color: '374151' })]
            : [
                new TextRun({ text: 'Levelised Cost of Energy (LCOE): ', bold: true, size: 22, color: navy }),
                new TextRun({ text: `At ₹${r.lcoe.toFixed(4)}/kWh, this system generates electricity at a fraction of the current grid tariff of ₹${r.inputs.tariff}/kWh — locking in savings that grow every year as tariffs escalate at ${r.inputs.escalationPercent}% annually.`, size: 22, color: '374151' }),
              ],
          spacing: { after: 100 },
        }),
        // Tariff escalation paragraph — use DOM override if available
        ...(textOverrides?.['financial-p2'] ? [new Paragraph({
          children: [new TextRun({ text: textOverrides['financial-p2'], size: 22, color: '374151' })],
          spacing: { after: 100 },
        })] : []),
      ];
    })() : multilineParagraphs(textOverrides?.['financial-no-roi'] ?? savingsText(p))),
    new Paragraph({ text: '', spacing: { after: 80 } }),
    ...(opt('environmental-impact')
      ? [
          heading('Environmental Impact'),
          new Paragraph({
            children: textOverrides?.['env-intro']?.trim()
              ? [new TextRun({ text: textOverrides['env-intro']!, size: 22, color: '374151' })]
              : [
                  new TextRun({ text: 'By harnessing solar energy, ', size: 22, color: '374151' }),
                  new TextRun({ text: p.customer.customerName || 'your organisation', bold: true, size: 22, color: '374151' }),
                  new TextRun({ text: ' will make a meaningful contribution to environmental sustainability — reducing carbon emissions, conserving natural resources, and supporting India\'s clean energy goals.', size: 22, color: '374151' }),
                ],
            spacing: { after: 160 },
          }),
          ...(() => {
            const co2 = p.roi?.co2OffsetTons;
            const gen = p.roi?.annualGeneration;
            const name = p.customer.customerName || 'your organisation';
            const envBullets = [
              {
                icon: '🌍', title: 'Carbon Footprint Reduction', color: '16a34a', bg: 'F0FDF4',
                body: co2
                  ? `Over 25 years, the proposed system will offset approximately ${co2.toFixed(1)} tonnes of CO₂ emissions — equivalent to planting thousands of trees and removing hundreds of cars from the road.`
                  : 'The solar system will significantly reduce carbon emissions over its 25-year operational life, contributing to a cleaner, greener environment.',
              },
              {
                icon: '⚡', title: 'Clean Energy Generation', color: '1d4ed8', bg: 'EFF6FF',
                body: gen
                  ? `Each year, the system will generate ${gen.toLocaleString('en-IN')} kWh of clean, renewable electricity — directly reducing dependence on fossil-fuel-based grid power.`
                  : 'The system will generate clean, renewable electricity every year, directly offsetting grid consumption powered by fossil fuels.',
              },
              {
                icon: '🏛️', title: 'National Solar Mission Alignment', color: 'b45309', bg: 'FEFCE8',
                body: `This initiative aligns with India's National Solar Mission and demonstrates ${name}'s commitment to a sustainable future and responsible energy consumption.`,
              },
              {
                icon: '♻️', title: 'Long-Term Sustainability', color: '7c3aed', bg: 'F5F3FF',
                body: 'Rayenna Energy will ensure the system is designed and installed to maximise energy yield and environmental benefit throughout its 25-year operational life, with ongoing monitoring and support.',
              },
            ];
            const rows = [];
            for (let r = 0; r < 2; r++) {
              rows.push(
                new TableRow({
                  children: [0, 1].map((c) => {
                    const idx = r * 2 + c;
                    const b = envBullets[idx];
                    const title = ov(textOverrides, `env-bullet-${idx}-title`, b.title);
                    const body = ov(textOverrides, `env-bullet-${idx}-body`, b.body);
                    return new TableCell({
                      shading: { type: ShadingType.SOLID, color: b.bg },
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: `${b.icon}  ${title}`, bold: true, size: 20, color: b.color })],
                          spacing: { after: 60 },
                        }),
                        new Paragraph({
                          children: [new TextRun({ text: body, size: 19, color: '374151' })],
                        }),
                      ],
                    });
                  }),
                })
              );
            }
            return [
              new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
              new Paragraph({ text: '', spacing: { after: 80 } }),
            ];
          })(),
        ]
      : []),
    ...(roofLayout
      ? (() => {
          // Detect image type from the URL so the DOCX embed format is correct
          const roofImgUrl = (roofLayout.prefer_3d_for_proposal && roofLayout.layout_image_3d_url)
            ? roofLayout.layout_image_3d_url
            : roofLayout.layout_image_url;
          const roofImgType: 'jpg' | 'png' =
            typeof roofImgUrl === 'string' && roofImgUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';

          const roofMetricLabels = ['Roof area (m²)', 'Usable area (m²)', 'Panel count'];
          const roofMetricValues = [
            Number.isFinite(roofLayout.roof_area_m2) ? `${Number(roofLayout.roof_area_m2).toFixed(1)}` : '—',
            Number.isFinite(roofLayout.usable_area_m2) ? `${Number(roofLayout.usable_area_m2).toFixed(1)}` : '—',
            Number.isFinite(roofLayout.panel_count) ? String(roofLayout.panel_count) : '—',
          ];
          const docxSizeKw = (p.roi?.inputs.systemSizeKw ?? 0) > 0
            ? p.roi!.inputs.systemSizeKw
            : (p.systemSizeKw || p.roiAutofill?.systemSizeKw || 0);
          if (docxSizeKw > 0) {
            roofMetricLabels.push('System size (kW)');
            roofMetricValues.push(`${Number(docxSizeKw).toFixed(1)} kW`);
          }

          return [
          heading('Proposed Rooftop Solar Layout'),
          ...(roofLayoutImageData
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: roofLayoutImageData,
                      transformation: { width: 600, height: 390 },
                      type: roofImgType,
                    }),
                  ],
                  spacing: { after: 120 },
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({
                text: 'The following values summarise the AI-assisted rooftop solar layout generated for this project.',
                size: 22,
                color: '374151',
              }),
            ],
            spacing: { after: 160 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: roofMetricLabels.map(
                  (label) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: label, bold: true, size: 20, color: white })],
                        }),
                      ],
                      shading: { type: ShadingType.SOLID, color: navy },
                    }),
                ),
              }),
              new TableRow({
                children: roofMetricValues.map(
                  (value) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          alignment: AlignmentType.CENTER,
                          children: [new TextRun({ text: value, size: 20, color: '111827' })],
                        }),
                      ],
                    }),
                ),
              }),
            ],
          }),
          new Paragraph({ text: '', spacing: { after: 200 } }),
          ];
        })()
      : []),
    ...(opt('our-process')
      ? [
          heading('Our Process for Seamless Solar Integration'),
          new Paragraph({
            children: [new TextRun({
              text: ov(textOverrides, 'our-process-intro', OUR_PROCESS_INTRO),
              size: 22,
              color: '374151',
            })],
            spacing: { after: 160 },
          }),
          (() => {
            const bgColors = ['EFF6FF', 'E0F2FE', 'F0FDF4', 'FFFBEB', 'F5F3FF'];
            const fgColors = ['0369a1', '0891b2', '059669', 'd97706', '7c3aed'];
            const processCell = (idx: number) => {
              const step = OUR_PROCESS_STEPS[idx]!;
              const title = ov(textOverrides, `process-step-${idx}-title`, step.title);
              const desc = ov(textOverrides, `process-step-${idx}-desc`, step.desc);
              return new TableCell({
                shading: { type: ShadingType.SOLID, color: bgColors[idx] },
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: `${idx + 1}`, bold: true, size: 28, color: fgColors[idx] })],
                    spacing: { after: 40 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: `${step.icon}  ${title.toUpperCase()}`, bold: true, size: 18, color: fgColors[idx] })],
                    spacing: { after: 60 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: desc, size: 17, color: '374151' })],
                  }),
                ],
              });
            };
            const emptyCell = new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: '' })],
            });
            const rows: DocxTableRow[] = [];
            for (let i = 0; i < OUR_PROCESS_STEPS.length; i += 2) {
              rows.push(new TableRow({
                children: [
                  processCell(i),
                  i + 1 < OUR_PROCESS_STEPS.length ? processCell(i + 1) : emptyCell,
                ],
              }));
            }
            return new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows,
            });
          })(),
          new Paragraph({ text: '', spacing: { after: 120 } }),
        ]
      : []),
    heading('Scope of Work'),
    new Paragraph({
      children: [new TextRun({ text: ov(textOverrides, 'scope-intro', scopeText(p)), size: 22, color: '374151' })],
      spacing: { after: 160 },
    }),
    (() => {
      const scopeSections = resolveScopeSectionsForExport(p.systemType, textOverrides);
      const scopeCell = (idx: number) => {
        const s = scopeSections[idx];
        return new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: 'F8FAFC' },
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${s.icon}  ${s.title}`, bold: true, size: 22, color: navy })],
              spacing: { after: 80 },
            }),
            ...s.items.map((item) =>
              new Paragraph({
                children: [
                  new TextRun({ text: '• ', bold: true, size: 20, color: navy }),
                  new TextRun({ text: item, size: 20, color: '374151' }),
                ],
                spacing: { after: 40 },
                indent: { left: 180 },
              }),
            ),
          ],
        });
      };
      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [0, 1].map(scopeCell) }),
          new TableRow({ children: [2, 3].map(scopeCell) }),
        ],
      });
    })(),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    ...(opt('responsibility-matrix') ? raciSection : []),
    ...roiSection,
    ...customBeforeBoqDocx,
    ...(opt('technical-details') ? techDetailsSection : []),
    ...bomSection,
    ...commercialsSection,
    ...paymentSection,
    heading('Account Details'),
    new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      rows: [
        ['Name',           'Rayenna Energy Private Limited'],
        ['Type',           'Current Account'],
        ['Bank',           'Axis Bank Limited'],
        ['Account Number', '924020063493172'],
        ['IFSC Code',      'UTIB0000827'],
      ].map(([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, color: navy })] })],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, color: '374151' })] })],
            }),
          ],
        }),
      ),
    }),
    new Paragraph({ text: '', spacing: { after: 120 } }),
    ...(opt('warranty') ? warrantySection : []),
    heading('Material Delivery Period'),
    ...(textOverrides?.['list-material-delivery-period']
      ? textOverrides['list-material-delivery-period'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : DELIVERY_TERMS.map((t, i) => listItem(t, i + 1))),
    ...(opt('offer-validity')
      ? [
          heading('Offer Validity'),
          new Paragraph({
            children: [new TextRun({ text: resolveOfferValidity(textOverrides), size: 20, color: '374151' })],
            spacing: { after: 120 },
          }),
        ]
      : []),
    heading('Terms & Conditions'),
    ...(textOverrides?.['list-terms-&-conditions']
      ? textOverrides['list-terms-&-conditions'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
      : TERMS_AND_CONDITIONS.map((t, i) => listItem(t, i + 1))),
    ...(opt('service-details')
      ? [
          heading('Service Details'),
          ...(textOverrides?.['list-service-details']
            ? textOverrides['list-service-details'].split('\n').filter(Boolean).map((t, i) => listItem(t, i + 1))
            : SERVICE_DETAILS.map((t, i) => listItem(t, i + 1))),
        ]
      : []),
    ...(opt('key-points')
      ? [
          heading('Key Points'),
          ...resolveKeyPoints(textOverrides).map((t, i) => listItem(t, i + 1)),
        ]
      : []),
    ...(opt('exclusions')
      ? [
          heading('Exclusions'),
          ...resolveExclusions(textOverrides).map((t, i) => listItem(t, i + 1)),
        ]
      : []),
    heading('Closing Note'),
    ...(() => {
      const override = textOverrides?.['section-closing-note'];
      const body = override && override.trim().length > 0 ? override : closingText(p);
      return multilineParagraphs(body);
    })(),
    ...(opt('subsidy-disclaimer')
      ? [
          heading('Subsidy Disclaimer and Payment Terms'),
          ...multilineParagraphs(SUBSIDY_DISCLAIMER_TEXT),
        ]
      : []),
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date(p.generatedAt).toLocaleString('en-IN')}  |  ${p.refNumber}`, size: 16, color: '9CA3AF', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 480 },
    }),
  ];

  return new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Rayenna Energy Private Limited  ·  www.rayennaenergy.com  ·  +91 7907 369 304',
                    size: 14,
                    color: '94A3B8',
                  }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${p.refNumber}  ·  Confidential proposal`,
                    size: 14,
                    color: '94A3B8',
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: sections,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
  });
}
