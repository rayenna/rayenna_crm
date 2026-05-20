import type { ImportRow } from './types';
import { cellStr } from './format';

function mapHeader(raw: string): keyof ImportRow | null {
  // Strip spaces, underscores, hyphens, slashes, and any non-ASCII/symbol chars (like ₹, (), etc.)
  const h = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['category', 'cat', 'type'].includes(h))                                                    return 'category';
  if (['item', 'itemname', 'description', 'desc', 'name', 'material'].includes(h))                return 'itemName';
  if (['specification', 'spec', 'specs', 'make', 'model', 'details', 'remarks'].includes(h))      return 'specification';
  if (['qty', 'quantity', 'nos', 'number', 'count', 'units'].includes(h))                         return 'quantity';
  if (['unitcost', 'unitprice', 'rate', 'price', 'cost', 'unitrate'].includes(h))                 return 'unitCost';
  return null;
}

/** Parse an uploaded file (xlsx / xls / csv) into ImportRow[] */
export async function parseFile(file: File): Promise<ImportRow[]> {
  // Guardrails: reduce risk from malformed/hostile spreadsheets and avoid UI hangs.
  const MAX_IMPORT_BYTES = 3 * 1024 * 1024; // 3 MB
  const MAX_IMPORTED_ROWS = 5000;
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      `File is too large to import. Please use a smaller file (max ${(MAX_IMPORT_BYTES / 1024 / 1024).toFixed(0)} MB).`,
    );
  }

  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array', cellFormula: false });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (rows.length < 1) { resolve([]); return; }
        if (rows.length > MAX_IMPORTED_ROWS) {
          reject(new Error(`Too many rows to import (${rows.length}). Please limit to ${MAX_IMPORTED_ROWS} rows.`));
          return;
        }

        // Find the header row — skip any leading instruction/note rows.
        // A valid header row must map at least one recognised column key.
        let headerRowIdx = -1;
        const colMap: Record<number, keyof ImportRow> = {};
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const candidate = rows[i] as unknown[];
          const map: Record<number, keyof ImportRow> = {};
          candidate.forEach((h, ci) => {
            const key = mapHeader(cellStr(h));
            if (key) map[ci] = key;
          });
          if (Object.keys(map).length >= 2) {   // need at least 2 recognised cols
            headerRowIdx = i;
            Object.assign(colMap, map);
            break;
          }
        }

        if (headerRowIdx === -1) { resolve([]); return; }

        if (import.meta.env.DEV) {
          console.log('[Import] headerRowIdx:', headerRowIdx, 'colMap:', colMap,
            'sample row:', rows[headerRowIdx + 1]);
        }

        const parsed: ImportRow[] = [];
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r] as unknown[];
          const raw: Partial<ImportRow> = {};
          Object.entries(colMap).forEach(([col, key]) => {
            raw[key] = cellStr(row[Number(col)]);
          });

          // Skip completely blank rows
          if (!raw.itemName && !raw.quantity && !raw.unitCost) continue;

          const item: ImportRow = {
            category:      raw.category      ?? '',
            itemName:      raw.itemName      ?? '',
            specification: raw.specification ?? '',
            quantity:      raw.quantity      ?? '',
            unitCost:      raw.unitCost      ?? '',
          };

          // Only hard-error on missing item name; qty/cost default to 0 if blank
          if (!item.itemName) item.error = 'Item name missing';

          parsed.push(item);
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

/** Generate and download a blank template .xlsx */
export async function downloadTemplate() {
  const XLSX = await import('xlsx');
  // ── Sheet 1: Costing Sheet ──────────────────────────────────────────────
  // Row 0 — instruction note (spans all 5 columns visually via merge)
  // Row 1 — column headers
  // Rows 2+ — sample data covering every category
  const costingData: (string | number)[][] = [
    // Instruction row
    ['NOTE: Replace sample data with your own. Do NOT change column headers. Category must match the keys in the "Category Reference" sheet.', '', '', '', ''],
    // Header row
    ['Category', 'Item Name', 'Specification', 'Quantity', 'Unit Cost (₹)'],
    // ── PV Modules ──
    ['pv-modules', 'Waaree 540W Mono PERC',        '540W, 144-cell, Mono PERC, 21.5% eff.',              93,  26000],
    // ── Inverters ──
    ['inverters',  'Solis 50kW String Inverter',   '50kW, 3-phase, IP65, 98.4% eff.',                     1, 185000],
    // ── Mounting Structure ──
    ['mounting-structure', 'GI Mounting Structure','Hot-dip galvanised, 2mm, 15° fixed tilt (per module)', 93,  2600],
    // ── DC Dist. Board ──
    ['dc-db', 'DC Distribution Board',             'IP65, 4-string, MCB + SPD Type II',                    1,  8500],
    // ── AC Dist. Board ──
    ['ac-db', 'AC Distribution Board',             'IP65, MCCB 100A + SPD + RCCB',                         1,  7000],
    // ── DC Cable ──
    ['dc-cable', 'DC Cable 4mm²',                  'UV-resistant, 1500V DC, TÜV certified (per metre)',   400,    52],
    ['dc-cable', 'MC4 Connectors (pair)',           'IP68, 30A, TÜV certified',                             50,   120],
    // ── AC Cable ──
    ['ac-cable', 'AC Cable 16mm²',                 'Armoured XLPE, 1100V AC (per metre)',                  60,   180],
    // ── Earthing ──
    ['earthing', 'Earthing & Lightning Arrestor',  'As per IS 3043 / IEC 62305',                            1, 12000],
    // ── Meter ──
    ['meter',    'Net Meter & DISCOM Charges',     'Bi-directional, DISCOM-approved',                       1, 15000],
    // ── Installation ──
    ['installation', 'Installation & Commissioning','EPC turnkey — civil, electrical & commissioning',      1, 85000],
    // ── Electrical Items ──
    ['electrical-items', 'Switches & Sockets',     'Distribution board switches, sockets, indicators',       30,   80],
    ['electrical-items', 'Lugs & Cable Glands',    'Copper lugs, cable glands, junction boxes (lot)',        1,  5000],
    // ── Others ──
    ['others', 'SCADA / Monitoring System',        'Cloud-based, 4G/Wi-Fi, app + web dashboard',            1, 22000],
    ['others', 'Cable Tray & Conduit',             'GI perforated cable tray + PVC conduit (lot)',           1, 12000],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(costingData);

  // Merge the instruction row across all 5 columns (A1:E1)
  ws1['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  // Freeze the header row (row index 1, i.e. the second row)
  ws1['!freeze'] = { xSplit: 0, ySplit: 2 };

  // Column widths: Category | Item Name | Specification | Qty | Unit Cost
  ws1['!cols'] = [
    { wch: 22 },   // Category
    { wch: 38 },   // Item Name
    { wch: 48 },   // Specification
    { wch: 10 },   // Quantity
    { wch: 16 },   // Unit Cost
  ];

  // ── Sheet 2: Category Reference ────────────────────────────────────────
  const refData: (string | number)[][] = [
    ['Category Key (use exactly as-is)', 'Display Label', 'GST Rate', 'Typical Items'],
    ['pv-modules',         'PV Modules',         '5%',  'Solar panels / modules'],
    ['inverters',          'Inverters',           '5%',  'String inverters, micro-inverters'],
    ['mounting-structure', 'Mounting Structure',  '18%', 'GI / aluminium racking, rails, clamps'],
    ['dc-db',              'DC Dist. Board',      '18%', 'DC combiner / distribution board, MCB, SPD'],
    ['ac-db',              'AC Dist. Board',      '18%', 'AC distribution board, MCCB, RCCB, SPD'],
    ['dc-cable',           'DC Cable',            '18%', 'DC cables, MC4 connectors, DC conduit'],
    ['ac-cable',           'AC Cable',            '18%', 'AC cables, armoured cables, AC conduit'],
    ['earthing',           'Earthing',            '18%', 'Earthing electrodes, lightning arrestors'],
    ['meter',              'Meter',               '18%', 'Net meter, energy meter, DISCOM charges'],
    ['installation',       'Installation',        '18%', 'Labour, civil work, commissioning, testing'],
    ['electrical-items',   'Electrical Items',    '18%', 'Switches, sockets, lugs, glands, junction boxes'],
    ['others',             'Others',              '18%', 'SCADA, cable tray, miscellaneous items'],
    ['', '', '', ''],
    ['TIP: Column order in the Costing Sheet does not matter. Unrecognised category values default to "others".', '', '', ''],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(refData);

  // Merge tip row
  ws2['!merges'] = [{ s: { r: 13, c: 0 }, e: { r: 13, c: 3 } }];

  ws2['!cols'] = [
    { wch: 36 },   // Key
    { wch: 22 },   // Label
    { wch: 10 },   // GST
    { wch: 46 },   // Typical items
  ];

  // ── Build workbook ──────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Costing Sheet');
  XLSX.utils.book_append_sheet(wb, ws2, 'Category Reference');
  XLSX.writeFile(wb, 'rayenna_costing_template.xlsx');
}
