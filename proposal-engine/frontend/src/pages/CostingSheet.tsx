import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { getActiveCustomer, upsertCustomer } from '../lib/customerStore';
import type { CostingArtifact } from '../lib/customerStore';
import {
  CATEGORIES, CATEGORY_GST, CATEGORY_COLORS,
  SHEETS_STORAGE_KEY, BOM_FROM_COSTING_KEY, ROI_AUTOFILL_KEY,
  DEFAULT_MARGIN,
  snapCategory, catAccentColor, deriveSystemSizeKw, sheetGrandTotal, sheetTotalGst, costingToBom,
} from '../lib/costingConstants';
import type {
  Category, LineItem, SavedSheet, StoredBom, RoiAutofill,
} from '../lib/costingConstants';

// ─────────────────────────────────────────────
// Export helpers (Costing Sheet)
// ─────────────────────────────────────────────

function exportCostingXlsx(items: LineItem[], sheetName: string, showGst: boolean, marginPercent: number) {
  const m = 1 + marginPercent / 100;
  const headerRow = showGst
    ? ['Category', 'Item / Description', 'Specification', 'Qty', 'Unit Cost (₹)', 'GST %', 'GST Amount (₹)', 'Total (incl. GST) (₹)']
    : ['Category', 'Item / Description', 'Specification', 'Qty', 'Unit Cost (₹)', 'Total (₹)'];

  const dataRows = items
    .filter((r) => r.itemName.trim())
    .map((r) => {
      const unitWithMargin = toNum(r.unitCost) * m;
      const base = toNum(r.quantity) * unitWithMargin;
      const gst  = base * (toNum(r.gstPercent) / 100);
      if (showGst) {
        return [r.category, r.itemName, r.specification ?? '', toNum(r.quantity), Math.round(unitWithMargin), toNum(r.gstPercent), Math.round(gst), Math.round(base + gst)];
      }
      return [r.category, r.itemName, r.specification ?? '', toNum(r.quantity), Math.round(unitWithMargin), Math.round(base)];
    });

  // Subtotal = sum of (qty × unitWithMargin), i.e. base cost at margin-inclusive prices
  const filtered  = items.filter(r => r.itemName.trim());
  const totalBase = filtered.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m, 0);
  const baseNoMargin = filtered.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
  const totalMargin  = totalBase - baseNoMargin;
  const totalGst  = showGst ? filtered.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m * (toNum(r.gstPercent) / 100), 0) : 0;
  const grand     = totalBase + totalGst;

  const blankRow  = showGst ? ['', '', '', '', '', '', '', ''] : ['', '', '', '', '', ''];
  const subtotalRow = showGst
    ? ['', 'Subtotal (excl. GST)', '', '', '', '', '', Math.round(totalBase)]
    : ['', 'Subtotal', '', '', '', Math.round(totalBase)];
  const gstRow = showGst
    ? ['', 'Total GST', '', '', '', '', '', Math.round(totalGst)]
    : null;
  const marginRow = showGst
    ? ['', `Margin (${marginPercent}%)`, '', '', '', '', '', Math.round(totalMargin)]
    : ['', `Margin (${marginPercent}%)`, '', '', '', Math.round(totalMargin)];
  const grandRow = showGst
    ? ['', 'TOTAL PROJECT COST (incl. GST)', '', '', '', '', '', Math.round(grand)]
    : ['', 'TOTAL PROJECT COST', '', '', '', Math.round(grand)];

  const allRows = [
    headerRow,
    ...dataRows,
    blankRow,
    subtotalRow,
    ...(gstRow ? [gstRow] : []),
    marginRow,
    grandRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(allRows);
  ws['!cols'] = showGst
    ? [{ wch: 12 }, { wch: 36 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 20 }]
    : [{ wch: 12 }, { wch: 36 }, { wch: 28 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Costing Sheet');
  XLSX.writeFile(wb, `${sheetName.replace(/[^a-zA-Z0-9_\-. ]/g, '_')}_Costing.xlsx`);
}

function exportCostingCsv(items: LineItem[], sheetName: string, showGst: boolean, marginPercent: number) {
  const header = showGst
    ? 'Category,Item / Description,Specification,Qty,Unit Cost,GST %,GST Amount,Total (incl. GST)'
    : 'Category,Item / Description,Specification,Qty,Unit Cost,Total';

  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const mCsv = 1 + marginPercent / 100;
  const rows = items
    .filter((r) => r.itemName.trim())
    .map((r) => {
      const unitWithMargin = toNum(r.unitCost) * mCsv;
      const base = toNum(r.quantity) * unitWithMargin;
      const gst  = base * (toNum(r.gstPercent) / 100);
      if (showGst) {
        return [r.category, r.itemName, r.specification ?? '', toNum(r.quantity), Math.round(unitWithMargin), toNum(r.gstPercent), Math.round(gst), Math.round(base + gst)].map(escape).join(',');
      }
      return [r.category, r.itemName, r.specification ?? '', toNum(r.quantity), Math.round(unitWithMargin), Math.round(base)].map(escape).join(',');
    });

  const filteredItems = items.filter(r => r.itemName.trim());
  const totalBase = filteredItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * mCsv, 0);
  const baseNoMargin = filteredItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
  const totalMargin  = totalBase - baseNoMargin;
  const totalGst  = showGst ? filteredItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * mCsv * (toNum(r.gstPercent) / 100), 0) : 0;
  const grand     = totalBase + totalGst;

  const summaryLines = showGst
    ? [`,,,,,,,`, `,"Subtotal (excl. GST)",,,,,,${Math.round(totalBase)}`, `,"Total GST",,,,,,${Math.round(totalGst)}`, `,"Margin (${marginPercent}%)",,,,,,${Math.round(totalMargin)}`, `,"TOTAL PROJECT COST (incl. GST)",,,,,,${Math.round(grand)}`]
    : [`,,,,`, `,"Subtotal",,,,${Math.round(totalBase)}`, `,"Margin (${marginPercent}%)",,,,${Math.round(totalMargin)}`, `,"TOTAL PROJECT COST",,,,${Math.round(grand)}`];

  const csv = [header, ...rows, ...summaryLines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${sheetName.replace(/[^a-zA-Z0-9_\-. ]/g, '_')}_Costing.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Types (local only — shared types imported from costingConstants)
// ─────────────────────────────────────────────

interface FormValues {
  items: LineItem[];
}

const EMPTY_ROW: LineItem = {
  category:      'pv-modules',
  itemName:      '',
  specification: '',
  quantity:      '',
  unitCost:      '',
  gstPercent:    String(CATEGORY_GST['pv-modules']),
};

// ─────────────────────────────────────────────
// Template system — persisted in localStorage
// ─────────────────────────────────────────────

const STORAGE_KEY = 'rayenna_costing_templates_v1';

interface CostingTemplate {
  id: string;
  name: string;
  description: string;
  savedAt: string;          // ISO date string
  items: LineItem[];
  isBuiltIn?: boolean;      // built-in starters cannot be deleted
}

/** Six Rayenna production templates — converted directly from actual project Excel files */
const BUILT_IN_TEMPLATES: CostingTemplate[] = [
  // ── 1. 3KW DCR ──────────────────────────────────────────────────────────────
  {
    id: 'builtin_3kw_dcr',
    name: '3KW DCR',
    description: '3 kW On-Grid Residential — DCR (Domestic Content Requirement)',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'TopCon Module',                              specification: 'ADANI 600-620 DCR TOPCON MODULE',                          quantity: '5',   unitCost: '17050', gstPercent: '5'  },
      { category: 'inverters',          itemName: '3kW String Inverter',                        specification: 'SOLAR GRID TIED STRING INVERTER-3KW 1PH MAKE:SUNWAYS/DEYE/SOLAIRE', quantity: '1', unitCost: '19000', gstPercent: '5'  },
      { category: 'ac-db',              itemName: '1-5KW 1PH ACDB',                             specification: '1-5KW 1PH ACDB PREMIUM HAVELLS',                           quantity: '1',   unitCost: '1400',  gstPercent: '18' },
      { category: 'dc-db',              itemName: '1-5KW 1IN 1OUT DCDB',                        specification: '1-5KW 1IN 1OUT DCDB PREMIUM HAVELLS',                      quantity: '1',   unitCost: '1600',  gstPercent: '18' },
      { category: 'dc-cable',           itemName: 'DC Cable',                                   specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '90',  unitCost: '41',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: 'AC Cable',                                   specification: '4SQMM AC CU CABLE HAVELLS',                                quantity: '30',  unitCost: '43',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors (pair)',                      specification: 'MC4 CONNECTORS SIBASS',                                    quantity: '6',   unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '70',  unitCost: '110',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '310',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Single Spike',            specification: 'LIGHTNING ARRESTER SINGLE SPIKE EXCEL',                    quantity: '1',   unitCost: '650',   gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 1PH',                              specification: 'METER BOX 1PH',                                            quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 40A 2P',                         specification: 'AC ISOLATOR 40A 2P HAVELLS',                               quantity: '1',   unitCost: '250',   gstPercent: '18' },
      { category: 'meter',              itemName: '1PH Unidirectional Meter',                   specification: '1PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM ISI Light PVC Pipe Ivory',              specification: '20MM ISI LIGHT PVC PIPE IVORY',                            quantity: '30',  unitCost: '50',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Bend Ivory',                            specification: '20MM BEND IVORY',                                          quantity: '25',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Tee Ivory',                             specification: '20MM TEE IVORY',                                           quantity: '5',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Elbow Ivory',                           specification: '20MM ELBOW IVORY',                                         quantity: '25',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Coupling Ivory',                        specification: '20MM COUPLING IVORY',                                      quantity: '5',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Flexible Hose Ivory',                   specification: '20MM FLEXIBLE HOSE IVORY',                                 quantity: '3',   unitCost: '12',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM SS Clamp',                              specification: '20MM SS CLAMP',                                            quantity: '150', unitCost: '4',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '3',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '200', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '50',  unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '150', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '3',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '1',   unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '10',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '7',   unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '2',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '2',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '3',   unitCost: '1146',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '3',   unitCost: '750',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 3*1.5',                              specification: 'END CAP-3*1.5',                                            quantity: '40',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '1',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sliding Door 4*4',                           specification: "SLIDING DOOR 4*4'",                                        quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '1000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '3',   unitCost: '4000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '3',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '70',  unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning and other work',                            quantity: '1',   unitCost: '1000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '1000',  gstPercent: '18' },
    ],
  },

  // ── 2. 5KW DCR ──────────────────────────────────────────────────────────────
  {
    id: 'builtin_5kw_dcr',
    name: '5KW DCR',
    description: '5 kW On-Grid Residential — DCR (Domestic Content Requirement)',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'TopCon Module',                              specification: 'ADANI 620DCR TOPCON MODULE',                                quantity: '8',   unitCost: '17360', gstPercent: '5'  },
      { category: 'inverters',          itemName: '5kW String Inverter',                        specification: 'SOLAR GRID TIED STRING INVERTER-5KW 1PH MAKE:DEYE/GROWATT', quantity: '1',   unitCost: '27000', gstPercent: '5'  },
      { category: 'ac-db',              itemName: '1-5KW 1PH ACDB',                             specification: '1-5KW 1PH ACDB PREMIUM HAVELLS',                           quantity: '1',   unitCost: '1400',  gstPercent: '18' },
      { category: 'dc-db',              itemName: '1-5KW 2IN 2OUT DCDB',                        specification: '1-5KW 2IN 2OUT DCDB PREMIUM HAVELLS',                      quantity: '1',   unitCost: '3000',  gstPercent: '18' },
      { category: 'dc-cable',           itemName: '4SQMM DC Cable Polycab',                     specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '120', unitCost: '41',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: '6SQMM AC CU Cable Havells',                  specification: '6SQMM AC CU CABLE HAVELLS',                                quantity: '30',  unitCost: '67',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors',                             specification: 'MC4 CONNECTORS SIBASS',                                    quantity: '10',  unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '80',  unitCost: '115',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Single Spike',            specification: 'LIGHTNING ARRESTER SINGLE SPIKE EXCEL',                    quantity: '1',   unitCost: '650',   gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 1PH',                              specification: 'METER BOX 1PH',                                            quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 40A 2P',                         specification: 'AC ISOLATOR 40A 2P HAVELLS',                               quantity: '1',   unitCost: '250',   gstPercent: '18' },
      { category: 'meter',              itemName: '1PH Unidirectional Meter',                   specification: '1PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM ISI Light PVC Pipe Ivory',              specification: '25MM ISI LIGHT PVC PIPE IVORY',                            quantity: '25',  unitCost: '70',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Bend Ivory',                            specification: '25MM BEND IVORY',                                          quantity: '20',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Tee Ivory',                             specification: '25MM TEE IVORY',                                           quantity: '5',   unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Elbow Ivory',                           specification: '25MM ELBOW IVORY',                                         quantity: '25',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Coupling Ivory',                        specification: '25MM COUPLING IVORY',                                      quantity: '5',   unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Flexible Hose Ivory',                   specification: '25MM FLEXIBLE HOSE IVORY',                                 quantity: '3',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM SS Clamp',                              specification: '25MM SS CLAMP',                                            quantity: '150', unitCost: '5',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '3',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '200', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '50',  unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '150', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '3',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '11',  unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '45',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '7',   unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '2',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '2',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '5',   unitCost: '1300',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '4',   unitCost: '750',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 2x2',                                specification: 'END CAP-2x2',                                              quantity: '30',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '1',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sliding Door 4*4',                           specification: "SLIDING DOOR 4*4'",                                        quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '2500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '5',   unitCost: '3500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '5',   unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '100', unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning',                                           quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '1000',  gstPercent: '18' },
    ],
  },

  // ── 3. 5KW Non DCR ──────────────────────────────────────────────────────────
  {
    id: 'builtin_5kw_nondcr',
    name: '5KW Non DCR',
    description: '5 kW On-Grid Residential — Non-DCR',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'TopCon Module',                              specification: 'WAAREE 590NDCR TOPCON MODULE',                              quantity: '9',   unitCost: '10620', gstPercent: '5'  },
      { category: 'inverters',          itemName: '5kW String Inverter',                        specification: 'SOLAR GRID TIED STRING INVERTER-5KW 1PH MAKE:DEYE/GROWATT', quantity: '1',   unitCost: '28000', gstPercent: '5'  },
      { category: 'ac-db',              itemName: '1-5KW 1PH ACDB',                             specification: '1-5KW 1PH ACDB PREMIUM HAVELLS',                           quantity: '1',   unitCost: '1400',  gstPercent: '18' },
      { category: 'dc-db',              itemName: '1-5KW 2IN 2OUT DCDB',                        specification: '1-5KW 2IN 2OUT DCDB PREMIUM HAVELLS',                      quantity: '1',   unitCost: '3000',  gstPercent: '18' },
      { category: 'dc-cable',           itemName: '4SQMM DC Cable Polycab',                     specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '180', unitCost: '41',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: '16SQMM AC AL Cable Havells',                 specification: '16SQMM AC AL CABLE HAVELLS',                               quantity: '45',  unitCost: '106',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors',                             specification: 'MC4 CONNECTORS SIBASS',                                    quantity: '10',  unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '120', unitCost: '140',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Single Spike',            specification: 'LIGHTNING ARRESTER SINGLE SPIKE EXCEL',                    quantity: '1',   unitCost: '650',   gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 1PH',                              specification: 'METER BOX 1PH',                                            quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 40A 2P',                         specification: 'AC ISOLATOR 40A 2P HAVELLS',                               quantity: '1',   unitCost: '250',   gstPercent: '18' },
      { category: 'meter',              itemName: '1PH Unidirectional Meter',                   specification: '1PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM ISI Light PVC Pipe Ivory',              specification: '25MM ISI LIGHT PVC PIPE IVORY',                            quantity: '30',  unitCost: '70',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Bend Ivory',                            specification: '25MM BEND IVORY',                                          quantity: '25',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Tee Ivory',                             specification: '25MM TEE IVORY',                                           quantity: '5',   unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Elbow Ivory',                           specification: '25MM ELBOW IVORY',                                         quantity: '25',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Coupling Ivory',                        specification: '25MM COUPLING IVORY',                                      quantity: '5',   unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Flexible Hose Ivory',                   specification: '25MM FLEXIBLE HOSE IVORY',                                 quantity: '3',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM SS Clamp',                              specification: '25MM SS CLAMP',                                            quantity: '150', unitCost: '5',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '3',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '200', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '50',  unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '150', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '10',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '3',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '11',  unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '45',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '7',   unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '2',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '2',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '5',   unitCost: '1300',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '4',   unitCost: '750',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 2x2',                                specification: 'END CAP-2x2',                                              quantity: '30',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '1',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sliding Door 4*4',                           specification: "SLIDING DOOR 4*4'",                                        quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '2500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '5',   unitCost: '3500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '5',   unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '100', unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '600',   gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning',                                           quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '1000',  gstPercent: '18' },
    ],
  },

  // ── 4. 10KW Non DCR ─────────────────────────────────────────────────────────
  {
    id: 'builtin_10kw_nondcr',
    name: '10KW Non DCR',
    description: '10 kW On-Grid Commercial — Non-DCR',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'TopCon Module',                              specification: 'WAAREE 590NDCR TOPCON MODULE',                              quantity: '17',  unitCost: '10620', gstPercent: '5'  },
      { category: 'inverters',          itemName: '10kW String Inverter',                       specification: 'SOLAR GRID TIED STRING INVERTER-10KW 3PH MAKE:DEYE/GROWATT/SUNWAYS', quantity: '1', unitCost: '48000', gstPercent: '5' },
      { category: 'ac-db',              itemName: '10KW 3PH ACDB',                              specification: '10KW 3PH ACDB PREMIUM HAVELLS',                            quantity: '1',   unitCost: '4500',  gstPercent: '18' },
      { category: 'dc-db',              itemName: '10KW 2IN 2OUT DCDB',                         specification: '10KW 2IN 2OUT DCDB PREMIUM HAVELLS',                       quantity: '1',   unitCost: '6500',  gstPercent: '18' },
      { category: 'dc-cable',           itemName: '4SQMM DC Cable Polycab',                     specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '200', unitCost: '41',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: '16SQMM AC AL Cable Havells',                 specification: '16SQMM AC AL CABLE HAVELLS',                               quantity: '60',  unitCost: '106',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors',                             specification: 'MC4 CONNECTORS SIBASS',                                    quantity: '15',  unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '120', unitCost: '110',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '310',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '1',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Single Spike',            specification: 'LIGHTNING ARRESTER SINGLE SPIKE EXCEL',                    quantity: '1',   unitCost: '650',   gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 3PH',                              specification: 'METER BOX 3PH',                                            quantity: '1',   unitCost: '1000',  gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 40A 4P',                         specification: 'AC ISOLATOR 40A 4P HAVELLS',                               quantity: '1',   unitCost: '750',   gstPercent: '18' },
      { category: 'meter',              itemName: '3PH Unidirectional Meter',                   specification: '3PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '1',   unitCost: '6000',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM ISI Light PVC Pipe Ivory',              specification: '25MM ISI LIGHT PVC PIPE IVORY',                            quantity: '30',  unitCost: '70',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Bend Ivory',                            specification: '25MM BEND IVORY',                                          quantity: '30',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Tee Ivory',                             specification: '25MM TEE IVORY',                                           quantity: '10',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Elbow Ivory',                           specification: '25MM ELBOW IVORY',                                         quantity: '30',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Coupling Ivory',                        specification: '25MM COUPLING IVORY',                                      quantity: '10',  unitCost: '8',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Flexible Hose Ivory',                   specification: '25MM FLEXIBLE HOSE IVORY',                                 quantity: '3',   unitCost: '12',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM SS Clamp',                              specification: '25MM SS CLAMP',                                            quantity: '200', unitCost: '5',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '5',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '300', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '100', unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '200', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '20',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '20',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '5',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '2',   unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '10',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '20',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '8',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '8',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '10',  unitCost: '1100',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '15',  unitCost: '850',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 2x2',                                specification: 'END CAP-2x2',                                              quantity: '50',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '1',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sliding Door 4*4',                           specification: "SLIDING DOOR 4*4'",                                        quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '10',  unitCost: '3500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '10',  unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '70',  unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '800',   gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning',                                           quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '1000',  gstPercent: '18' },
    ],
  },

  // ── 5. 15KW Non DCR Hybrid ──────────────────────────────────────────────────
  {
    id: 'builtin_15kw_hybrid',
    name: '15KW Non DCR Hybrid',
    description: '15 kW Hybrid Solar System with Battery — Non-DCR, 3-Phase',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'BiFacial Module',                            specification: 'RENEWSYS 615 NDCR BIFACIAL MODULE',                        quantity: '24',  unitCost: '11070', gstPercent: '5'  },
      { category: 'inverters',          itemName: '15kW Hybrid Inverter 3PH',                   specification: 'SOLAR GRID TIED HYBRID INVERTER-15KW 3PH MAKE:DEYE',        quantity: '1',   unitCost: '205000',gstPercent: '5'  },
      { category: 'inverters',          itemName: '100AH Lithium Battery',                      specification: '100AH LITHIUM BATTERY',                                    quantity: '7',   unitCost: '75000', gstPercent: '5'  },
      { category: 'inverters',          itemName: 'MCCB for Hybrid 630A / Busbar',              specification: 'MCCB FOR HYBRID-630A/ BUSBAR',                             quantity: '1',   unitCost: '25000', gstPercent: '18' },
      { category: 'ac-db',              itemName: '15KW 3PH ACDB Hybrid with COS',              specification: '15KW 3PH ACDB HYBRID WITH COS PREMIUM HAVELLS',            quantity: '1',   unitCost: '10000', gstPercent: '18' },
      { category: 'dc-db',              itemName: '15KW 3IN 3OUT DCDB',                         specification: '15KW 3IN 3OUT DCDB PREMIUM HAVELLS',                       quantity: '1',   unitCost: '11000', gstPercent: '18' },
      { category: 'dc-cable',           itemName: '4SQMM DC Cable Polycab',                     specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '250', unitCost: '50',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: '4Core 35SQMM AC AL Cable Polycab',           specification: '4CORE 35SQMM AC AL CABLE POLYCAB',                         quantity: '900', unitCost: '260',   gstPercent: '18' },
      { category: 'earthing',           itemName: '35SQMM CU Wire',                             specification: '35SQMM CU WIRE',                                           quantity: '60',  unitCost: '500',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors',                             specification: 'MC4 CONNECTORS SIBASS',                                    quantity: '20',  unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '150', unitCost: '110',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '330',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '350',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '3',   unitCost: '280',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '2',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Multi Spike',             specification: 'LIGHTNING ARRESTER MULTI SPIKE EXCEL',                     quantity: '3',   unitCost: '1100',  gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 3PH',                              specification: 'METER BOX 3PH',                                            quantity: '3',   unitCost: '1500',  gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 40A 4P',                         specification: 'AC ISOLATOR 40A 4P HAVELLS',                               quantity: '3',   unitCost: '750',   gstPercent: '18' },
      { category: 'meter',              itemName: '3PH Unidirectional Meter',                   specification: '3PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '2',   unitCost: '6700',  gstPercent: '18' },
      { category: 'meter',              itemName: '3PH Bidirectional Meter',                    specification: '3PH BIDIRECTION METER GENUS/VISIONTEK',                    quantity: '1',   unitCost: '10000', gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM ISI Light PVC Pipe Ivory',              specification: '25MM ISI LIGHT PVC PIPE IVORY',                            quantity: '40',  unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Bend Ivory',                            specification: '25MM BEND IVORY',                                          quantity: '50',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Tee Ivory',                             specification: '25MM TEE IVORY',                                           quantity: '30',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Elbow Ivory',                           specification: '25MM ELBOW IVORY',                                         quantity: '50',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Coupling Ivory',                        specification: '25MM COUPLING IVORY',                                      quantity: '10',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Flexible Hose Ivory',                   specification: '25MM FLEXIBLE HOSE IVORY',                                 quantity: '3',   unitCost: '12',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM SS Clamp',                              specification: '25MM SS CLAMP',                                            quantity: '300', unitCost: '5',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '5',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '400', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '300', unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '150', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '15',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '40',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '8',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '3',   unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '10',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '20',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '4',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '4',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '12',  unitCost: '1250',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '10',  unitCost: '850',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 2*1',                               specification: 'GP PIPES 2*1',                                             quantity: '25',  unitCost: '850',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 3*1.5',                              specification: 'END CAP-3*1.5',                                            quantity: '100', unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '1',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sliding Door 4*4',                           specification: "SLIDING DOOR 4*4'",                                        quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '2500',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '15',  unitCost: '4000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '15',  unitCost: '3000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '200', unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '3500',  gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning',                                           quantity: '1',   unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '5000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '15000', gstPercent: '18' },
    ],
  },

  // ── 6. 25KW Non DCR ─────────────────────────────────────────────────────────
  {
    id: 'builtin_25kw_nondcr',
    name: '25KW Non DCR',
    description: '25 kW On-Grid Commercial — Non-DCR, 3-Phase',
    savedAt: '2025-01-01T00:00:00.000Z',
    isBuiltIn: true,
    items: [
      { category: 'pv-modules',         itemName: 'TopCon Module',                              specification: 'NDCR WAAREE/RENEWSYS 580-635 WP TOPCON MODULE',             quantity: '40',  unitCost: '10795', gstPercent: '5'  },
      { category: 'inverters',          itemName: '25kW String Inverter 3PH',                   specification: 'SOLAR GRID TIED STRING INVERTER-25KW 3PH MAKE: SUNWATT/DEYE/FOXESS', quantity: '1', unitCost: '82000', gstPercent: '5' },
      { category: 'ac-db',              itemName: '25KW 3PH ACDB',                              specification: '25KW 1PH ACDB PREMIUM HAVELLS',                            quantity: '1',   unitCost: '7000',  gstPercent: '18' },
      { category: 'dc-db',              itemName: '25KW 4IN 4OUT DCDB',                         specification: '25KW 4IN 4OUT DCDB PREMIUM HAVELLS',                       quantity: '1',   unitCost: '13000', gstPercent: '18' },
      { category: 'dc-cable',           itemName: '4SQMM DC Cable Polycab',                     specification: '4SQMM DC CABLE POLYCAB',                                   quantity: '300', unitCost: '41',    gstPercent: '18' },
      { category: 'ac-cable',           itemName: '4C 25SQMM AC AL Armoured Cable',             specification: '4C 25SQMM AL ARMOURED CABLE',                              quantity: '50',  unitCost: '220',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'MC4 Connectors',                             specification: 'MC4 CONNECTORS',                                           quantity: '20',  unitCost: '35',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Bare Copper 10SWG',                          specification: 'BARE COPPER 10SWG',                                        quantity: '150', unitCost: '80',    gstPercent: '18' },
      { category: 'earthing',           itemName: 'Copper Bonded Rod 4ft',                      specification: 'COPPER BONDED ROD 4FT EXCEL',                              quantity: '3',   unitCost: '310',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Chamber',                              specification: 'EARTH CHAMBER EXCEL',                                     quantity: '3',   unitCost: '300',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Earth Compound 10 KG',                       specification: 'EARTH COMPOUND 10 KG EXCEL',                               quantity: '3',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'SS Terminal Strip / Earth Bench 4 Pole',     specification: 'SS TERMINAL STRIP/EARTH BENCH 4POLE EXCEL',                quantity: '2',   unitCost: '200',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'PVC Channel 45*45 Cable Tray',               specification: 'PVC CHANNEL 45*45 CABLE TRAY',                             quantity: '3',   unitCost: '100',   gstPercent: '18' },
      { category: 'earthing',           itemName: 'Lightning Arrestor Multi Spike',             specification: 'LIGHTNING ARRESTER MULTI SPIKE EXCEL',                     quantity: '2',   unitCost: '1200',  gstPercent: '18' },
      { category: 'meter',              itemName: 'Meter Box 3PH',                              specification: 'METER BOX 3PH',                                            quantity: '1',   unitCost: '1300',  gstPercent: '18' },
      { category: 'meter',              itemName: 'AC Isolator 63A 3P',                         specification: 'AC ISOLATOR 63A 3P HAVELLS',                               quantity: '1',   unitCost: '800',   gstPercent: '18' },
      { category: 'meter',              itemName: '3PH Unidirectional Meter',                   specification: '3PH UNIDIRECTION METER GENUS/VISIONTEK',                   quantity: '1',   unitCost: '6000',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM ISI Light PVC Pipe Ivory',              specification: '25MM ISI LIGHT PVC PIPE IVORY',                            quantity: '40',  unitCost: '70',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Bend Ivory',                            specification: '25MM BEND IVORY',                                          quantity: '50',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Tee Ivory',                             specification: '25MM TEE IVORY',                                           quantity: '10',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Elbow Ivory',                           specification: '25MM ELBOW IVORY',                                         quantity: '50',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Coupling Ivory',                        specification: '25MM COUPLING IVORY',                                      quantity: '10',  unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM Flexible Hose Ivory',                   specification: '25MM FLEXIBLE HOSE IVORY',                                 quantity: '5',   unitCost: '12',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '25MM SS Clamp',                              specification: '25MM SS CLAMP',                                            quantity: '300', unitCost: '4',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '6MM Plastic Sleeve',                         specification: '6MM PLASTIC SLEEVE',                                       quantity: '3',   unitCost: '7',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Fisher 6MM',                                 specification: 'FISHER 6MM',                                               quantity: '400', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*38 SS',                  specification: 'SELF TAPING SCREW 6*38 SS(1.5")',                          quantity: '150', unitCost: '1.5',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Self Taping Screw 6*25 SS',                  specification: 'SELF TAPING SCREW 6*25 SS(1")',                            quantity: '300', unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM Mid Clamp',                             specification: '35MM MID CLAMP',                                           quantity: '50',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '35MM End Clamp',                             specification: '35MM END CLAMP',                                           quantity: '30',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Insulation Tape Red/Black/Green',            specification: 'INSULATION TAPE RED/BLACK/GREEN',                          quantity: '5',   unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: '20MM Cycle Screw with Washer',               specification: '20MM CYCLE SCREW WITH WASHER',                             quantity: '10',  unitCost: '1',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: '4-6 SQMM CU Ring Lug',                       specification: '4-6 SQMM CU RING LUG',                                     quantity: '20',  unitCost: '4.8',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: '370*4.6 Cable Tie',                          specification: '370*4.6 CABLE TIE',                                        quantity: '100', unitCost: '2',     gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Base Plate 4*4',                             specification: 'BASE PLATE 4*4',                                           quantity: '2',   unitCost: '60',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Anchor Bolt 8MM',                            specification: 'ANCHOR BOLT 8MM',                                          quantity: '10',  unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Cutting Wheel',                              specification: 'CUTTING WHEEL',                                            quantity: '30',  unitCost: '20',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Amcos Epoxy Primer Grey 1 Ltr',              specification: 'AMCOS EPOXY PRIMER GREY 1 LTR',                            quantity: '8',   unitCost: '400',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Sheenlac Thinner D13 1 Ltr',                 specification: 'SHEENLAC THINNER D13*1 LTR',                               quantity: '8',   unitCost: '200',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 3*1.5',                             specification: 'GP PIPES 3*1.5',                                           quantity: '20',  unitCost: '1100',  gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'GP Pipes 1.5*1.5',                           specification: 'GP PIPES 1.5*1.5',                                         quantity: '50',  unitCost: '850',   gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'End Cap 2x2',                                specification: 'END CAP-2x2',                                              quantity: '100', unitCost: '10',    gstPercent: '18' },
      { category: 'mounting-structure', itemName: 'Welding Rod 12 Gauge',                       specification: 'WELDING ROD 12 GUAGE',                                     quantity: '2',   unitCost: '400',   gstPercent: '18' },
      { category: 'others',             itemName: 'Miscellaneous',                              specification: 'MISCELLANEOUS',                                            quantity: '1',   unitCost: '10000', gstPercent: '18' },
      { category: 'installation',       itemName: 'Structure Labour',                           specification: 'STRUCTURE LABOUR',                                         quantity: '25',  unitCost: '4000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Labour',                          specification: 'ELECTRICAL LABOUR',                                        quantity: '25',  unitCost: '2000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Transportation',                             specification: 'TRANSPORTATION',                                           quantity: '70',  unitCost: '40',    gstPercent: '18' },
      { category: 'installation',       itemName: 'Unloading',                                  specification: 'UNLOADING',                                                quantity: '1',   unitCost: '1500',  gstPercent: '18' },
      { category: 'others',             itemName: 'KSEB Liasoning',                             specification: 'KSEB Liasoning',                                           quantity: '1',   unitCost: '4000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Travel Expenses',                            specification: 'TRAVEL EXPENSES',                                          quantity: '1',   unitCost: '3000',  gstPercent: '18' },
      { category: 'installation',       itemName: 'Electrical Contractor',                      specification: 'ELECTRICAL CONTRACTOR',                                    quantity: '1',   unitCost: '1000',  gstPercent: '18' },
    ],
  },
];

function loadTemplates(): CostingTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved: CostingTemplate[] = raw ? JSON.parse(raw) : [];
    return [...BUILT_IN_TEMPLATES, ...saved];
  } catch {
    return [...BUILT_IN_TEMPLATES];
  }
}

function saveTemplates(templates: CostingTemplate[]) {
  const userTemplates = templates.filter((t) => !t.isBuiltIn);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userTemplates));
}

function templateTotal(items: LineItem[]): number {
  return items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
}

// ─────────────────────────────────────────────
// Saved Sheets — persisted in localStorage
// ─────────────────────────────────────────────

function loadSheets(): SavedSheet[] {
  try {
    const raw = localStorage.getItem(SHEETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSheets(sheets: SavedSheet[]) {
  localStorage.setItem(SHEETS_STORAGE_KEY, JSON.stringify(sheets));
}

// ─────────────────────────────────────────────
// Save Sheet Modal
// ─────────────────────────────────────────────

function SaveSheetModal({
  onSave,
  onCancel,
  itemCount,
  defaultName,
}: {
  onSave:      (name: string, description: string) => void;
  onCancel:    () => void;
  itemCount:   number;
  defaultName: string;
}) {
  const [name, setName]   = useState(defaultName);
  const [desc, setDesc]   = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Please enter a sheet name.'); return; }
    onSave(name.trim(), desc.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Save Costing Sheet</h2>
              <p className="text-white/80 text-xs">{itemCount} line item{itemCount !== 1 ? 's' : ''} will be saved</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Sheet Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Sharma Residence — 5 kW"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Notes <span className="text-secondary-400 font-normal">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Revised quote after site visit"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            Save Sheet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Saved Sheets Panel
// ─────────────────────────────────────────────

function SavedSheetsPanel({
  sheets,
  onLoad,
  onDelete,
  onClose,
}: {
  sheets:   SavedSheet[];
  onLoad:   (s: SavedSheet, mode: 'append' | 'replace') => void;
  onDelete: (id: string) => void;
  onClose:  () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadTarget, setLoadTarget]       = useState<SavedSheet | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📂</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Saved Costing Sheets</h2>
              <p className="text-white/80 text-xs">{sheets.length} sheet{sheets.length !== 1 ? 's' : ''} saved</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Sheet list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {sheets.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-8 text-center">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm text-secondary-500 font-medium">No saved sheets yet</p>
              <p className="text-xs text-secondary-400 mt-1">
                Fill in your costing sheet and click <strong>Save Sheet</strong> to save it here
              </p>
            </div>
          ) : (
            sheets
              .slice()
              .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
              .map((s) => {
                const total = sheetGrandTotal(s.items, s.showGst);
                const date  = new Date(s.savedAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                });
                const time  = new Date(s.savedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                });
                const cats  = [...new Set(s.items.map((i) => i.category))];

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    style={{ borderLeftWidth: '4px', borderLeftColor: '#0ea5e9' }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-secondary-800 truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-secondary-500 mt-0.5 truncate">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap mt-2">
                        <span className="text-xs text-secondary-400">{s.items.length} items</span>
                        {total > 0 && (
                          <span className="text-xs font-semibold tabular-nums" style={{ color: '#0d1b3a' }}>
                            ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            {s.showGst && <span className="text-secondary-400 font-normal"> incl. GST</span>}
                          </span>
                        )}
                        <span className="text-xs text-secondary-400">{date} · {time}</span>
                        <div className="flex gap-1">
                          {cats.slice(0, 4).map((c) => (
                            <span key={c} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[c as Category] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                              {c}
                            </span>
                          ))}
                          {cats.length > 4 && <span className="text-[9px] text-secondary-400">+{cats.length - 4}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setConfirmDelete(s.id)}
                        title="Delete sheet"
                        className="p-1.5 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        🗑
                      </button>
                      <button
                        onClick={() => setLoadTarget(s)}
                        className="text-xs text-white font-semibold px-4 py-1.5 rounded-lg shadow transition-all"
                        style={{ background: '#0d1b3a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                      >
                        Load →
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>

        {/* Load mode picker */}
        {loadTarget && (
          <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-secondary-600 mb-3">
              Load <strong className="text-primary-800">{loadTarget.name}</strong> — how should it be added?
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setLoadTarget(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'append'); setLoadTarget(null); onClose(); }}
                className="text-sm text-secondary-700 font-medium px-4 py-1.5 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors"
              >
                + Append to existing
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'replace'); setLoadTarget(null); onClose(); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl shadow transition-all"
                style={{ background: '#0d1b3a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
              >
                Replace all rows
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="border-t border-red-100 bg-red-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-red-700 mb-3 font-medium">Delete this sheet? This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Save Template Modal
// ─────────────────────────────────────────────

function SaveTemplateModal({
  onSave,
  onCancel,
  itemCount,
}: {
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  itemCount: number;
}) {
  const [name, setName]         = useState('');
  const [desc, setDesc]         = useState('');
  const [error, setError]       = useState('');

  const handleSave = () => {
    if (!name.trim()) { setError('Please enter a template name.'); return; }
    onSave(name.trim(), desc.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">💾</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Save as Template</h2>
              <p className="text-white/80 text-xs">{itemCount} line item{itemCount !== 1 ? 's' : ''} will be saved</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Template Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. 50 kW Commercial — Standard"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
              style={{ '--tw-ring-color': '#0d1b3a22' } as React.CSSProperties}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-secondary-400 font-normal">(optional)</span>
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Rooftop system with Waaree modules and Solis inverter"
              className="w-full border border-secondary-300 rounded-lg px-3 py-2.5 text-sm text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-2 focus:border-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50/60 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all"
            style={{ background: '#0d1b3a' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Templates Panel
// ─────────────────────────────────────────────

function TemplatesPanel({
  templates,
  onLoad,
  onDelete,
  onClose,
}: {
  templates: CostingTemplate[];
  onLoad: (t: CostingTemplate, mode: 'append' | 'replace') => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [loadTarget, setLoadTarget]       = useState<CostingTemplate | null>(null);

  const builtIn   = templates.filter((t) => t.isBuiltIn);
  const userSaved = templates.filter((t) => !t.isBuiltIn);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Costing Templates</h2>
              <p className="text-white/80 text-xs">
                {userSaved.length} saved · {builtIn.length} built-in starters
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Template list */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* User templates */}
          {userSaved.length > 0 && (
            <section>
              <h3 className="text-xs font-bold text-secondary-500 uppercase tracking-widest mb-3">Your Saved Templates</h3>
              <div className="space-y-3">
                {userSaved.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    onLoad={() => setLoadTarget(t)}
                    onDelete={() => setConfirmDelete(t.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {userSaved.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-secondary-200 p-6 text-center">
              <p className="text-2xl mb-2">💾</p>
              <p className="text-sm text-secondary-500 font-medium">No saved templates yet</p>
              <p className="text-xs text-secondary-400 mt-1">Fill in your costing sheet and click <strong>Save as Template</strong></p>
            </div>
          )}

          {/* Built-in starters */}
          <section>
            <h3 className="text-xs font-bold text-secondary-500 uppercase tracking-widest mb-3">
              Built-in Starters
              <span className="ml-2 text-[10px] text-secondary-400 font-normal normal-case">Ready-made Rayenna solar templates</span>
            </h3>
            <div className="space-y-3">
              {builtIn.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onLoad={() => setLoadTarget(t)}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Load mode picker */}
        {loadTarget && (
          <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-secondary-600 mb-3">
              Load <strong className="text-primary-800">{loadTarget.name}</strong> — how should it be added?
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setLoadTarget(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'append'); setLoadTarget(null); onClose(); }}
                className="text-sm text-secondary-700 font-medium px-4 py-1.5 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors"
              >
                + Append to existing
              </button>
              <button
                onClick={() => { onLoad(loadTarget, 'replace'); setLoadTarget(null); onClose(); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl shadow transition-all"
                style={{ background: '#0d1b3a' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
              >
                Replace all rows
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {confirmDelete && (
          <div className="border-t border-red-100 bg-red-50/60 px-6 py-4 flex-shrink-0">
            <p className="text-xs text-red-700 mb-3 font-medium">Delete this template? This cannot be undone.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(null)} className="text-sm text-secondary-500 hover:text-secondary-700 px-3 py-1.5 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); }}
                className="text-sm text-white font-semibold px-5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 shadow transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onLoad,
  onDelete,
}: {
  template: CostingTemplate;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const total    = templateTotal(template.items);
  const date     = new Date(template.savedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const cats     = [...new Set(template.items.map((i) => i.category))];

  return (
    <div className="bg-white rounded-xl border border-secondary-200 shadow-sm hover:shadow-md transition-all p-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderLeftWidth: '4px', borderLeftColor: '#0d1b3a' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-secondary-800 truncate">{template.name}</p>
          {template.isBuiltIn && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 border border-primary-200 font-medium flex-shrink-0">
              Built-in
            </span>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-secondary-500 mb-2 truncate">{template.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-secondary-400">{template.items.length} items</span>
          {total > 0 && (
            <span className="text-xs text-primary-700 font-semibold tabular-nums">
              ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          )}
          <span className="text-xs text-secondary-400">{date}</span>
          <div className="flex gap-1">
            {cats.slice(0, 4).map((c) => (
              <span key={c} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[c as Category] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                {c}
              </span>
            ))}
            {cats.length > 4 && <span className="text-[9px] text-secondary-400">+{cats.length - 4}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {!template.isBuiltIn && (
          <button
            onClick={onDelete}
            title="Delete template"
            className="p-1.5 rounded-lg text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            🗑
          </button>
        )}
        <button
          onClick={onLoad}
          className="text-xs text-white font-semibold px-4 py-1.5 rounded-lg shadow transition-all"
          style={{ background: '#0d1b3a' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
          onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
        >
          Load →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Excel import types
// ─────────────────────────────────────────────

interface ImportRow {
  category:      string;
  itemName:      string;
  specification: string;
  quantity:      string;
  unitCost:      string;
  error?: string;   // set if row has a validation issue
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function toNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) || n < 0 ? 0 : n;
}

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Normalise a raw cell value to a trimmed string */
function cellStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

/**
 * Map a raw header string to one of our known field keys.
 * Accepts many common variations people use in Excel.
 */
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
function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (rows.length < 1) { resolve([]); return; }

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

        // Debug: log what was found (visible in browser console)
        console.log('[Import] headerRowIdx:', headerRowIdx, 'colMap:', colMap,
          'sample row:', rows[headerRowIdx + 1]);

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
function downloadTemplate() {
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

// ─────────────────────────────────────────────
// Import Preview Modal
// ─────────────────────────────────────────────

function ImportModal({
  rows,
  onConfirm,
  onCancel,
}: {
  rows: ImportRow[];
  onConfirm: (mode: 'append' | 'replace') => void;
  onCancel: () => void;
}) {
  const validCount   = rows.filter((r) => !r.error).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border-2 border-primary-200/50 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📥</span>
            <div>
              <h2 className="text-white font-extrabold text-base drop-shadow">Import Preview</h2>
              <p className="text-white/80 text-xs">
                {validCount} valid row{validCount !== 1 ? 's' : ''}
                {invalidCount > 0 && (
                  <span className="text-amber-300 ml-2">· {invalidCount} with issues (will be skipped)</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-white/70 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10">
              <tr className="border-b-2 border-primary-200" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide w-28">Category</th>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide">Item Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-white uppercase tracking-wide">Specification</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-20">Qty</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-28">Unit Cost</th>
                <th className="px-3 py-2.5 text-right font-semibold text-white uppercase tracking-wide w-28">Total</th>
                <th className="px-3 py-2.5 w-6" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const snapped = snapCategory(row.category, row.itemName);
                const qty     = parseFloat(row.quantity) || 0;
                const uc      = parseFloat(row.unitCost)  || 0;
                const total   = qty * uc;
                const isErr   = !!row.error;

                return (
                  <tr
                    key={i}
                    className={`border-b border-secondary-100 ${isErr ? 'bg-amber-50/60' : 'hover:bg-primary-50/30'}`}
                  >
                    <td className="px-3 py-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${CATEGORY_COLORS[snapped]}`}>
                        {snapped}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-medium ${isErr ? 'text-amber-700' : 'text-secondary-800'}`}>
                      {row.itemName || <span className="text-secondary-400 italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-secondary-500 italic">
                      {row.specification || <span className="text-secondary-300 not-italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-secondary-700 tabular-nums">{row.quantity}</td>
                    <td className="px-3 py-2 text-right text-secondary-700 tabular-nums">
                      {uc > 0 ? `₹${fmt(uc)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-secondary-800 tabular-nums font-medium">
                      {total > 0 ? `₹${fmt(total)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isErr && (
                        <span className="text-amber-600 text-[10px] font-medium">{row.error}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-primary-100 bg-secondary-50/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
          <p className="text-xs text-secondary-500">
            How should the imported rows be added?
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-sm text-secondary-500 hover:text-secondary-700 px-4 py-2 rounded-lg border border-secondary-200 hover:bg-secondary-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm('append')}
              disabled={validCount === 0}
              className="text-sm text-secondary-700 font-medium px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-100 transition-colors disabled:opacity-40"
            >
              + Append to existing
            </button>
            <button
              onClick={() => onConfirm('replace')}
              disabled={validCount === 0}
              className="text-sm text-white font-semibold px-5 py-2 rounded-xl shadow-lg transition-all disabled:opacity-40"
              style={{ background: '#0d1b3a' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
            >
              Replace all rows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-component: a single editable row
// ─────────────────────────────────────────────

function CostRow({
  index,
  control,
  register,
  setValue,
  onRemove,
  isOnly,
  showGst,
  marginPercent,
}: {
  index: number;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  register: ReturnType<typeof useForm<FormValues>>['register'];
  setValue: ReturnType<typeof useForm<FormValues>>['setValue'];
  onRemove: () => void;
  isOnly: boolean;
  showGst: boolean;
  marginPercent: number;
}) {
  const qty        = useWatch({ control, name: `items.${index}.quantity` });
  const unitCost   = useWatch({ control, name: `items.${index}.unitCost` });
  const gstPercent = useWatch({ control, name: `items.${index}.gstPercent` });

  const m = 1 + (marginPercent / 100);
  const baseTotalNoMargin = toNum(qty) * toNum(unitCost);
  const baseTotal = baseTotalNoMargin * m; // margin-inclusive base (excl. GST)
  const gstAmt    = baseTotal * (toNum(gstPercent) / 100);
  const rowTotal  = showGst ? baseTotal + gstAmt : baseTotal;

  // Auto-fill GST when category changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cat = e.target.value as Category;
    setValue(`items.${index}.category`, cat);
    setValue(`items.${index}.gstPercent`, String(CATEGORY_GST[cat]));
  };

  return (
    <tr className="group border-b border-primary-100/60 hover:bg-primary-50/40 transition-colors">
      {/* Category */}
      <td className="px-3 py-2 w-36">
        <select
          {...register(`items.${index}.category`)}
          onChange={handleCategoryChange}
          className="w-full bg-transparent text-sm text-secondary-800 focus:outline-none cursor-pointer"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </td>

      {/* Item name */}
      <td className="px-3 py-2">
        <input
          {...register(`items.${index}.itemName`)}
          placeholder="e.g. Waaree 540W Mono PERC"
          className="w-full bg-transparent text-sm text-secondary-800 placeholder-secondary-400 focus:outline-none"
        />
      </td>

      {/* Specification — flows directly into BOM */}
      <td className="px-3 py-2">
        <input
          {...register(`items.${index}.specification`)}
          placeholder="e.g. 540W Mono PERC, 144-cell"
          className="w-full bg-transparent text-sm text-secondary-600 placeholder-secondary-300 focus:outline-none italic"
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-2 w-20">
        <input
          {...register(`items.${index}.quantity`)}
          type="number" min="0" step="any" placeholder="0"
          className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums"
        />
      </td>

      {/* Unit cost */}
      <td className="px-3 py-2 w-28">
        <div className="flex items-center gap-1">
          <span className="text-secondary-400 text-xs">₹</span>
          <input
            {...register(`items.${index}.unitCost`)}
            type="number" min="0" step="any" placeholder="0.00"
            className="w-full bg-transparent text-sm text-right text-secondary-800 placeholder-secondary-400 focus:outline-none tabular-nums"
          />
        </div>
      </td>

      {/* GST % — editable, auto-filled */}
      {showGst && (
        <td className="px-3 py-2 w-20">
          <div className="flex items-center gap-0.5">
            <input
              {...register(`items.${index}.gstPercent`)}
              type="number" min="0" max="28" step="1"
              className="w-full bg-transparent text-sm text-right text-secondary-800 focus:outline-none tabular-nums"
            />
            <span className="text-secondary-400 text-xs">%</span>
          </div>
          <span className="text-[9px] text-secondary-400 block text-right">
            ₹{fmt(gstAmt)}
          </span>
        </td>
      )}

      {/* Total */}
      <td className="px-3 py-2 w-32 text-right">
        <span className={`text-sm tabular-nums font-medium ${rowTotal > 0 ? 'text-primary-700' : 'text-secondary-400'}`}>
          ₹{fmt(rowTotal)}
        </span>
        {showGst && baseTotal > 0 && (
          <span className="text-[9px] text-secondary-400 block">
            excl. ₹{fmt(baseTotal)}
            {baseTotalNoMargin > 0 && <span className="ml-1">· cost ₹{fmt(baseTotalNoMargin)}</span>}
          </span>
        )}
      </td>

      {/* Remove */}
      <td className="px-2 py-2 w-8 text-center">
        <button
          type="button" onClick={onRemove} disabled={isOnly} title="Remove row"
          className="opacity-0 group-hover:opacity-100 transition-opacity text-secondary-400 hover:text-red-500 disabled:opacity-0 disabled:cursor-not-allowed text-lg leading-none"
        >×</button>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// Grouped costing table (single <table>, category group header rows)
// ─────────────────────────────────────────────

// CostingGroupedTable receives itemCategories as a plain string[] pre-computed
// by the parent — no useWatch/getValues inside, zero lag issues.
function CostingGroupedTable({
  fields, control, register, setValue, remove, append,
  showGst, marginPercent, itemCategories, liveItems, allCollapsed, resetSignal,
}: {
  fields:         { id: string }[];
  control:        ReturnType<typeof useForm<FormValues>>['control'];
  register:       ReturnType<typeof useForm<FormValues>>['register'];
  setValue:       ReturnType<typeof useForm<FormValues>>['setValue'];
  remove:         (index: number) => void;
  append:         (row: LineItem) => void;
  showGst:        boolean;
  marginPercent:  number;
  itemCategories: string[];   // index → category key, pre-resolved by parent
  liveItems:      LineItem[];
  allCollapsed:   boolean;    // true = collapse all, false = expand all
  resetSignal:    number;     // increment to clear collapsed state without remounting
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (cat: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });

  // Clear collapsed state when data is reset (e.g. after import or load)
  const prevResetSignal = React.useRef(resetSignal);
  useEffect(() => {
    if (prevResetSignal.current === resetSignal) return;
    prevResetSignal.current = resetSignal;
    setCollapsed(new Set());
  }, [resetSignal]);

  // Sync to parent's expand/collapse-all signal
  const prevAllCollapsed = React.useRef(allCollapsed);
  useEffect(() => {
    if (prevAllCollapsed.current === allCollapsed) return;
    prevAllCollapsed.current = allCollapsed;
    if (allCollapsed) {
      setCollapsed(new Set(CATEGORIES.map((c) => c.value)));
    } else {
      setCollapsed(new Set());
    }
  }, [allCollapsed]);

  const totalCols = showGst ? 8 : 7;

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    indices: fields.map((_, i) => i).filter((i) => (itemCategories[i] ?? 'others') === cat.value),
  })).filter((g) => g.indices.length > 0);

  if (fields.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-primary-100 px-4 py-10 text-center text-secondary-400 text-sm">
        No items yet. Use the <strong>+ Category</strong> buttons below to add rows, or import from Excel.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-x-auto">
      <table className={`border-collapse w-full ${showGst ? 'min-w-[1020px]' : 'min-w-[860px]'}`}>
        <thead>
          <tr className="border-b-2 border-primary-200 bg-primary-50/80">
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide w-36">Category</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">Item / Description</th>
            <th className="px-3 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wide">
              Specification <span className="ml-1 text-[9px] text-emerald-600 font-normal normal-case">→ BOM</span>
            </th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-20">Qty</th>
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-28">Unit Cost</th>
            {showGst && <th className="px-3 py-3 text-right text-xs font-semibold text-blue-600 uppercase tracking-wide w-20">GST %</th>}
            <th className="px-3 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wide w-32">
              Total {showGst ? '(incl.)' : ''}
            </th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ cat, indices }) => {
            const isOpen   = !collapsed.has(cat.value);
            const accent   = catAccentColor(cat.value);
            const catItems = indices.map((i) => liveItems[i]).filter(Boolean);
            const m = 1 + (marginPercent / 100);
            const base     = catItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m, 0);
            const gst      = catItems.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m * (toNum(r.gstPercent) / 100), 0);
            const catTotal = showGst ? base + gst : base;

            return (
              <React.Fragment key={cat.value}>
                {/* Category group header */}
                <tr
                  className="cursor-pointer select-none"
                  style={{ background: `${accent}15`, borderTop: `2px solid ${accent}50` }}
                  onClick={() => toggle(cat.value)}
                >
                  <td colSpan={totalCols} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold" style={{ color: accent }}>
                          {isOpen ? '▼' : '▶'}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${CATEGORY_COLORS[cat.value]}`}>
                          {cat.label}
                        </span>
                        <span className="text-xs text-secondary-500">
                          {indices.length} item{indices.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {catTotal > 0 && (
                          <span className="text-xs font-bold tabular-nums" style={{ color: accent }}>
                            ₹{fmt(catTotal)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            append({ ...EMPTY_ROW, category: cat.value, gstPercent: String(CATEGORY_GST[cat.value]) });
                            setCollapsed((prev) => { const n = new Set(prev); n.delete(cat.value); return n; });
                          }}
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-lg border"
                          style={{ color: accent, borderColor: `${accent}60`, background: 'white' }}
                        >
                          + Add row
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Data rows */}
                {isOpen && indices.map((globalIdx) => (
                  <CostRow
                    key={fields[globalIdx]?.id ?? globalIdx}
                    index={globalIdx}
                    control={control}
                    register={register}
                    setValue={setValue}
                    onRemove={() => remove(globalIdx)}
                    isOnly={fields.length === 1}
                    showGst={showGst}
                    marginPercent={marginPercent}
                  />
                ))}

                {/* Category subtotal */}
                {isOpen && catTotal > 0 && (
                  <tr style={{ background: `${accent}08`, borderBottom: `1px solid ${accent}30` }}>
                    <td colSpan={showGst ? 5 : 4} className="px-4 py-1.5 text-xs text-secondary-400 italic">
                      {cat.label} subtotal
                    </td>
                    <td className="px-3 py-1.5 text-right text-sm font-bold tabular-nums" style={{ color: accent }}>
                      ₹{fmt(catTotal)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// Grand total card
// ─────────────────────────────────────────────

function GrandTotalCard({ items, showGst, marginPercent }: { items: LineItem[]; showGst: boolean; marginPercent: number }) {
  const m = 1 + (marginPercent / 100);
  const baseNoMargin = items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
  const totalBase    = items.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost) * m, 0); // excl. GST, incl. margin
  const totalMargin  = totalBase - baseNoMargin;
  const totalGst     = showGst ? sheetTotalGst(items, marginPercent) : 0;
  const grand        = totalBase + totalGst;

  const gstByRate: Record<number, number> = {};
  items.forEach((r) => {
    const base = toNum(r.quantity) * toNum(r.unitCost) * m;
    const rate = toNum(r.gstPercent);
    if (rate > 0 && base > 0) {
      gstByRate[rate] = (gstByRate[rate] ?? 0) + base * (rate / 100);
    }
  });

  return (
    <div className="mt-4 rounded-xl border border-primary-200 overflow-hidden shadow-sm">
      <div className="bg-primary-50/60 px-4 py-2 border-b border-primary-100">
        <span className="text-xs font-semibold text-secondary-500 uppercase tracking-wide">Project Summary</span>
      </div>
      <div className="bg-white divide-y divide-primary-100">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs text-secondary-500">Subtotal {showGst ? '(excl. GST)' : ''}</span>
          <span className="text-sm font-medium text-secondary-700 tabular-nums">₹{fmt(totalBase)}</span>
        </div>
        {totalMargin > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-yellow-50/40">
            <span className="text-xs text-secondary-500">Margin ({marginPercent}%)</span>
            <span className="text-xs font-medium text-yellow-700 tabular-nums">+ ₹{fmt(totalMargin)}</span>
          </div>
        )}
        {showGst && Object.entries(gstByRate).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amt]) => (
          <div key={rate} className="flex items-center justify-between px-4 py-2 bg-blue-50/40">
            <span className="text-xs text-blue-700">
              GST @ {rate}%
              <span className="ml-1.5 text-[10px] text-blue-500">
                {Number(rate) === 5 ? '(Modules & Inverters)' : '(Structure / Cable / Labour / Misc)'}
              </span>
            </span>
            <span className="text-xs font-medium text-blue-700 tabular-nums">+ ₹{fmt(amt)}</span>
          </div>
        ))}
        {showGst && totalGst > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/70">
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Total GST</span>
            <span className="text-sm font-bold text-blue-800 tabular-nums">₹{fmt(totalGst)}</span>
          </div>
        )}
      </div>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
      >
        <span className="text-sm font-bold text-white uppercase tracking-wide drop-shadow">
          Total Project Cost{showGst ? ' (incl. GST)' : ''}
        </span>
        <span className="text-lg font-extrabold text-white tabular-nums drop-shadow">₹{fmt(grand)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Category breakdown panel
// ─────────────────────────────────────────────

function CategoryBreakdown({ items }: { items: LineItem[] }) {
  const byCategory = CATEGORIES.map(({ value, label }) => {
    const cost = items
      .filter((r) => r.category === value)
      .reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitCost), 0);
    return { value, label, cost };
  }).filter((c) => c.cost > 0);

  const total = byCategory.reduce((s, c) => s + c.cost, 0);

  if (byCategory.length === 0) return null;

  return (
    <div className="mt-8 bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-5">
      <h3 className="text-sm font-semibold text-secondary-700 mb-4 uppercase tracking-wide">
        Cost Breakdown by Category
      </h3>
      <div className="space-y-3">
        {byCategory.map(({ value, label, cost }) => {
          const pct = total > 0 ? (cost / total) * 100 : 0;
          return (
            <div key={value}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded border font-medium ${CATEGORY_COLORS[value as Category]}`}>
                  {label}
                </span>
                <span className="text-xs text-secondary-500 tabular-nums">
                  ₹{fmt(cost)} · {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'linear-gradient(to right, #0d1b3a, #eab308)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function CostingSheet() {
  // Read active customer data synchronously before form init — avoids useEffect lag
  const _initCustomer = getActiveCustomer();
  const _initCosting  = _initCustomer?.costing;

  // Migrate any saved items that have old category keys (e.g. 'module' → 'pv-modules')
  const _migrateItems = (items: LineItem[]): LineItem[] =>
    items.map((r) => ({ ...r, category: snapCategory(r.category ?? 'others', r.itemName ?? '') }));

  const _startItems: LineItem[] =
    _initCosting?.items && _initCosting.items.length > 0
      ? _migrateItems(_initCosting.items)
      : [{ ...EMPTY_ROW }];

  // Keep a ref to the "current initial items" so CostingTable always has
  // the right categories even before useWatch fires on first render
  const initialItemsRef = useRef<LineItem[]>(_startItems);

  // Incremented on every reset() so CostingGroupedTable remounts cleanly
  const [resetKey, setResetKey] = useState(0);

  const { control, register, handleSubmit, formState: { errors: _errors }, reset, setValue } =
    useForm<FormValues>({ defaultValues: { items: _startItems } });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });
  const liveItems: LineItem[] = watchedItems ?? [];

  const [showGst, setShowGst]           = useState(_initCosting?.showGst ?? true);
  const [marginPercent, setMarginPercent] = useState(_initCosting?.marginPercent ?? DEFAULT_MARGIN);

  // Re-load if active customer changes (e.g. user switches customer in same session)
  React.useEffect(() => {
    const ac = getActiveCustomer();
    if (ac?.costing?.items && ac.costing.items.length > 0) {
      const migrated = _migrateItems(ac.costing.items);
      initialItemsRef.current = migrated;
      reset({ items: migrated });
      setResetKey((k) => k + 1);
      if (ac.costing.showGst !== undefined) setShowGst(ac.costing.showGst);
      if (ac.costing.marginPercent !== undefined) setMarginPercent(ac.costing.marginPercent);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_initCustomer?.id]);

  // ── Template state ────────────────────────
  const [templates, setTemplates]               = useState<CostingTemplate[]>(loadTemplates);
  const [showTemplates, setShowTemplates]       = useState(false);
  const [showSaveModal, setShowSaveModal]       = useState(false);
  const [templateToast, setTemplateToast]       = useState<string | null>(null);

  // ── Saved Sheets state ────────────────────
  const [savedSheets, setSavedSheets]           = useState<SavedSheet[]>(loadSheets);
  const [showSheets, setShowSheets]             = useState(false);
  const [showSaveSheetModal, setShowSaveSheetModal] = useState(false);

  // ── Expand / Collapse All ─────────────────
  const [allCollapsed, setAllCollapsed]         = useState(false);

  const showToast = useCallback((msg: string) => {
    setTemplateToast(msg);
    setTimeout(() => setTemplateToast(null), 2500);
  }, []);

  const handleSaveTemplate = useCallback((name: string, description: string) => {
    const newTemplate: CostingTemplate = {
      id:          `tpl_${Date.now()}`,
      name,
      description,
      savedAt:     new Date().toISOString(),
      items:       liveItems.filter((r) => r.itemName.trim()),
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setShowSaveModal(false);
    showToast(`Template "${name}" saved!`);
  }, [liveItems, templates, showToast]);

  const handleLoadTemplate = useCallback((t: CostingTemplate, mode: 'append' | 'replace') => {
    const migrated = _migrateItems(t.items);
    if (mode === 'replace') {
      initialItemsRef.current = migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }];
      reset({ items: migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      const isOnlyBlank =
        liveItems.length === 1 &&
        !liveItems[0].itemName && !liveItems[0].quantity && !liveItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      migrated.forEach((row) => append(row));
    }
    showToast(`"${t.name}" loaded`);
  }, [liveItems, reset, remove, append, showToast]);

  const handleDeleteTemplate = useCallback((id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    showToast('Template deleted');
  }, [templates, showToast]);

  // Core save logic — called either directly (active customer) or from modal (no customer)
  const handleSaveSheet = useCallback((name: string, description: string) => {
    const validItems  = liveItems.filter((r) => r.itemName.trim());
    const grand       = sheetGrandTotal(validItems, showGst, marginPercent);
    const totalGst    = showGst ? sheetTotalGst(validItems, marginPercent) : 0;
    const sizeKw      = deriveSystemSizeKw(validItems);
    const now         = new Date().toISOString();

    // Overwrite existing sheet with same name, or create new entry
    const existingIdx = savedSheets.findIndex(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    const id = existingIdx >= 0 ? savedSheets[existingIdx].id : `sheet_${Date.now()}`;

    const sheet: SavedSheet = {
      id,
      name,
      description,
      savedAt:       now,
      items:         validItems,
      showGst,
      marginPercent,
      grandTotal:    grand,
      totalGst,
      systemSizeKw:  sizeKw,
    };

    const updated =
      existingIdx >= 0
        ? savedSheets.map((s, i) => (i === existingIdx ? sheet : s))
        : [...savedSheets, sheet];

    setSavedSheets(updated);
    persistSheets(updated);

    // Auto-generate BOM and persist to localStorage for BOMSheet to pick up
    const bomRows = costingToBom(validItems);
    const storedBom: StoredBom = {
      sheetId:     id,
      sheetName:   name,
      generatedAt: now,
      rows:        bomRows,
    };
    localStorage.setItem(BOM_FROM_COSTING_KEY, JSON.stringify(storedBom));

    // Write ROI autofill so ROI Calculator picks up the latest values
    const roiAutofill: RoiAutofill = {
      source:       'costing-sheet',
      sourceName:   name,
      savedAt:      now,
      grandTotal:   grand,
      systemSizeKw: sizeKw,
    };
    localStorage.setItem(ROI_AUTOFILL_KEY, JSON.stringify(roiAutofill));

    // Persist costing artifact to active customer record
    const activeCustomer = getActiveCustomer();
    if (activeCustomer) {
      const artifact: CostingArtifact = {
        sheetName:     name,
        savedAt:       now,
        items:         validItems,
        showGst,
        marginPercent,
        grandTotal:    grand,
        totalGst,
        systemSizeKw:  sizeKw,
      };
      upsertCustomer({ ...activeCustomer, costing: artifact, updatedAt: now });
    }

    setShowSaveSheetModal(false);
    showToast(activeCustomer
      ? `Sheet saved under ${activeCustomer.master.name} — BOM auto-generated!`
      : `Sheet "${name}" saved — BOM auto-generated!`);
  }, [liveItems, showGst, marginPercent, savedSheets, showToast]);

  const handleLoadSheet = useCallback((s: SavedSheet, mode: 'append' | 'replace') => {
    const migrated = _migrateItems(s.items);
    if (mode === 'replace') {
      initialItemsRef.current = migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }];
      reset({ items: migrated.length > 0 ? migrated : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      const isOnlyBlank =
        liveItems.length === 1 &&
        !liveItems[0].itemName && !liveItems[0].quantity && !liveItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      migrated.forEach((row) => append(row));
    }
    showToast(`"${s.name}" loaded`);
  }, [liveItems, reset, remove, append, showToast]);

  const handleDeleteSheet = useCallback((id: string) => {
    const updated = savedSheets.filter((s) => s.id !== id);
    setSavedSheets(updated);
    persistSheets(updated);
    showToast('Sheet deleted');
  }, [savedSheets, showToast]);

  // ── Import state ──────────────────────────
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [importRows, setImportRows]     = useState<ImportRow[] | null>(null);
  const [importError, setImportError]   = useState<string | null>(null);
  const [importing, setImporting]       = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';
    setImportError(null);
    setImporting(true);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        setImportError('No data rows found. Make sure the file has a header row and at least one data row.');
      } else {
        setImportRows(rows);
      }
    } catch {
      setImportError('Could not read the file. Please use .xlsx, .xls, or .csv format.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportConfirm = (mode: 'append' | 'replace') => {
    if (!importRows) return;
    const valid = importRows
      .filter((r) => !r.error)
      .map((r): LineItem => {
        const cat = snapCategory(r.category, r.itemName);
        return {
          category:      cat,
          itemName:      r.itemName,
          specification: r.specification ?? '',
          quantity:      r.quantity,
          unitCost:      r.unitCost,
          gstPercent:    String(CATEGORY_GST[cat]),
        };
      });

    if (mode === 'replace') {
      initialItemsRef.current = valid.length > 0 ? valid : [{ ...EMPTY_ROW }];
      reset({ items: valid.length > 0 ? valid : [{ ...EMPTY_ROW }] });
      setResetKey((k) => k + 1);
    } else {
      // Remove the single blank placeholder row if it's the only row and empty
      const currentItems = liveItems;
      const isOnlyBlank =
        currentItems.length === 1 &&
        !currentItems[0].itemName &&
        !currentItems[0].quantity &&
        !currentItems[0].unitCost;
      if (isOnlyBlank) remove(0);
      valid.forEach((row) => append(row));
    }
    setImportRows(null);
  };

  const onSubmit = () => {
    // If a customer is active, overwrite their sheet directly — no modal needed
    const ac = getActiveCustomer();
    if (ac) {
      handleSaveSheet(ac.master.name, '');
    } else {
      setShowSaveSheetModal(true);
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Import preview modal */}
      {importRows && (
        <ImportModal
          rows={importRows}
          onConfirm={handleImportConfirm}
          onCancel={() => setImportRows(null)}
        />
      )}

      {/* Save sheet modal — only shown when no active customer */}
      {showSaveSheetModal && (
        <SaveSheetModal
          itemCount={liveItems.filter((r) => r.itemName.trim()).length}
          defaultName={savedSheets.length > 0 ? savedSheets[savedSheets.length - 1].name : ''}
          onSave={handleSaveSheet}
          onCancel={() => setShowSaveSheetModal(false)}
        />
      )}

      {/* Saved sheets panel */}
      {showSheets && (
        <SavedSheetsPanel
          sheets={savedSheets}
          onLoad={handleLoadSheet}
          onDelete={handleDeleteSheet}
          onClose={() => setShowSheets(false)}
        />
      )}

      {/* Save template modal */}
      {showSaveModal && (
        <SaveTemplateModal
          itemCount={liveItems.filter((r) => r.itemName.trim()).length}
          onSave={handleSaveTemplate}
          onCancel={() => setShowSaveModal(false)}
        />
      )}

      {/* Templates panel */}
      {showTemplates && (
        <TemplatesPanel
          templates={templates}
          onLoad={handleLoadTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Toast notification */}
      {templateToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-primary-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-pulse">
          ✓ {templateToast}
        </div>
      )}

      <div>
        {/* Page card */}
        <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm">
          {/* Header strip */}
          <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-xl leading-none">
                  📊
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                    Costing Sheet
                  </h1>
                  <p className="mt-0.5 text-white/90 text-sm">
                    Add line items below. Total per row is calculated automatically.
                  </p>
                </div>
              </div>

              {/* Header action buttons — two rows: primary | secondary/export */}
              <div className="flex flex-col gap-2 w-full sm:w-auto flex-shrink-0">

                {/* Row 1 — primary actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* GST toggle */}
                  <button
                    type="button"
                    onClick={() => setShowGst((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors min-h-[36px] ${
                      showGst
                        ? 'bg-white/25 text-white border-white/50'
                        : 'bg-white/10 text-white/70 border-white/25 hover:bg-white/20'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full inline-block ${showGst ? 'bg-emerald-300' : 'bg-white/40'}`} />
                    GST {showGst ? 'ON' : 'OFF'}
                  </button>

                  {/* Saved Sheets button */}
                  <button
                    type="button"
                    onClick={() => setShowSheets(true)}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    📂 Saved Sheets
                    {savedSheets.length > 0 && (
                      <span className="bg-sky-400 text-primary-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {savedSheets.length}
                      </span>
                    )}
                  </button>

                  {/* Templates button */}
                  <button
                    type="button"
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    📋 Templates
                    {templates.filter((t) => !t.isBuiltIn).length > 0 && (
                      <span className="bg-yellow-400 text-primary-900 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {templates.filter((t) => !t.isBuiltIn).length}
                      </span>
                    )}
                  </button>

                  {/* Import Excel */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 text-xs text-white font-semibold bg-white/20 hover:bg-white/30 border border-white/40 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 min-h-[36px]"
                  >
                    {importing ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : '📥'}
                    Import Excel
                  </button>
                </div>

                {/* Row 2 — secondary / export actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Save as template */}
                  <button
                    type="button"
                    onClick={() => setShowSaveModal(true)}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    💾 Save as Template
                  </button>

                  {/* Export XLSX */}
                  <button
                    type="button"
                    onClick={() => {
                      const name = savedSheets.length > 0
                        ? savedSheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0].name
                        : 'Costing_Sheet';
                      exportCostingXlsx(liveItems.filter((r) => r.itemName.trim()), name, showGst, marginPercent);
                    }}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    📤 XLSX
                  </button>

                  {/* Export CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      const name = savedSheets.length > 0
                        ? savedSheets.slice().sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())[0].name
                        : 'Costing_Sheet';
                      exportCostingCsv(liveItems.filter((r) => r.itemName.trim()), name, showGst, marginPercent);
                    }}
                    disabled={liveItems.filter((r) => r.itemName.trim()).length === 0}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium disabled:opacity-40 min-h-[32px]"
                  >
                    📤 CSV
                  </button>

                  {/* Excel Template download */}
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/30 px-3 py-1.5 rounded-lg transition-colors font-medium min-h-[32px]"
                  >
                    ⬇ Template
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">

            {/* Active customer banner */}
            {(() => {
              const ac = getActiveCustomer();
              return ac ? (
                <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-sky-700">
                    <span className="font-semibold">Active customer:</span> {ac.master.name}
                    {ac.master.location ? ` · ${ac.master.location}` : ''}
                    {ac.costing && <span className="ml-2 text-emerald-600 font-medium">· Costing saved ✓</span>}
                  </p>
                  <Link to={`/customers/${ac.id}`} className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors">
                    View workspace →
                  </Link>
                </div>
              ) : (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-700">No active customer selected. Save Sheet will still work, but won't be linked to a customer record.</p>
                  <Link to="/customers" className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap">
                    Select Customer →
                  </Link>
                </div>
              );
            })()}

            {/* Import error banner */}
            {importError && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm flex items-start gap-2">
                <span className="text-base flex-shrink-0">⚠</span>
                <div>
                  <p className="font-semibold">Import failed</p>
                  <p className="text-xs mt-0.5">{importError}</p>
                </div>
                <button
                  onClick={() => setImportError(null)}
                  className="ml-auto text-amber-600 hover:text-amber-800 text-lg leading-none flex-shrink-0"
                >×</button>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* ── Expand / Collapse All bar ── */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-secondary-400 font-medium">
                  {fields.length} item{fields.length !== 1 ? 's' : ''} across {
                    [...new Set(fields.map((_, i) => initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'))].length
                  } categor{[...new Set(fields.map((_, i) => initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'))].length !== 1 ? 'ies' : 'y'}
                </span>
                <button
                  type="button"
                  onClick={() => setAllCollapsed((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                  style={allCollapsed
                    ? { background: '#0d1b3a', color: 'white', borderColor: '#0d1b3a' }
                    : { background: 'white', color: '#0d1b3a', borderColor: '#0d1b3a40' }
                  }
                >
                  <span>{allCollapsed ? '▶▶' : '▼▼'}</span>
                  {allCollapsed ? 'Expand All' : 'Collapse All'}
                </button>
              </div>

              {/* ── Grouped costing table ── */}
              <CostingGroupedTable
                fields={fields}
                control={control}
                register={register}
                setValue={setValue}
                remove={remove}
                append={append}
                showGst={showGst}
                marginPercent={marginPercent}
                itemCategories={fields.map((_, i) =>
                  initialItemsRef.current[i]?.category || liveItems[i]?.category || 'others'
                )}
                liveItems={liveItems.length > 0 ? liveItems : initialItemsRef.current}
                allCollapsed={allCollapsed}
                resetSignal={resetKey}
              />

              {/* Grand total summary */}
              {(liveItems.length > 0 ? liveItems : initialItemsRef.current).filter((r) => r.itemName?.trim()).length > 0 && (
                <GrandTotalCard
                  items={liveItems.length > 0 ? liveItems : initialItemsRef.current}
                  showGst={showGst}
                  marginPercent={marginPercent}
                />
              )}

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => {
                    const accent = catAccentColor(cat.value);
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => append({ ...EMPTY_ROW, category: cat.value, gstPercent: String(CATEGORY_GST[cat.value]) })}
                        className="flex items-center gap-1 text-xs font-medium transition-colors px-2.5 py-1.5 rounded-lg border hover:opacity-80"
                        style={{ color: accent, borderColor: `${accent}50`, background: `${accent}08` }}
                      >
                        <span className="text-sm leading-none">+</span>
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Editable Margin % */}
                  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <label className="text-xs font-semibold text-yellow-700 whitespace-nowrap">Margin %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                      className="w-14 bg-transparent text-sm font-bold text-yellow-800 text-right focus:outline-none tabular-nums"
                    />
                    <span className="text-xs text-yellow-600">%</span>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Clear all rows?')) {
                          remove(fields.map((_, i) => i));
                          append({ ...EMPTY_ROW });
                        }
                      }}
                      className="flex-1 sm:flex-none text-sm text-secondary-500 hover:text-secondary-700 transition-colors px-4 py-2.5 rounded-xl hover:bg-secondary-100 border border-secondary-200 min-h-[44px]"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none text-sm text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl min-h-[44px]"
                      style={{ background: '#0d1b3a' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0a1530')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0d1b3a')}
                    >
                      Save Sheet
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Category breakdown */}
            <CategoryBreakdown items={liveItems} />

            {/* How to import — help panel */}
            <div className="mt-8 bg-gradient-to-br from-primary-50/30 to-transparent border-t border-primary-100 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-secondary-600 mb-4">How to import from Excel</h3>
              <ol className="space-y-4">

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">1</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Click{' '}
                    <span className="inline-flex items-center gap-0.5 bg-secondary-100 border border-secondary-200 rounded px-1.5 py-0.5 font-semibold text-secondary-700 whitespace-nowrap">
                      ⬇ Template
                    </span>
                    {' '}to download a ready-made Excel template. It has two sheets: <em className="font-semibold not-italic text-secondary-600">Costing Sheet</em> (sample data covering all 11 categories) and <em className="font-semibold not-italic text-secondary-600">Category Reference</em> (valid keys + GST rates). Replace the sample rows with your own data.
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">2</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Fill in your data. Accepted columns:
                    <span className="block mt-1 flex flex-wrap gap-1">
                      {['Category', 'Item Name', 'Specification', 'Quantity', 'Unit Cost'].map((col) => (
                        <span key={col} className={`inline-block border rounded px-1.5 py-0.5 font-semibold text-[11px] ${col === 'Specification' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
                          {col}{col === 'Specification' ? ' *' : ''}
                        </span>
                      ))}
                    </span>
                    <span className="block mt-1">Column order doesn't matter. <em className="text-emerald-600 not-italic font-medium">* Specification is optional but flows directly into the BOM — saves manual re-entry.</em></span>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">3</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Valid categories (use the exact key value in your Excel):
                    <span className="block mt-1 flex flex-wrap gap-1">
                      {CATEGORIES.map((c) => (
                        <span key={c.value} className={`inline-block border rounded px-1.5 py-0.5 font-semibold text-[11px] ${CATEGORY_COLORS[c.value]}`}>
                          {c.value}
                        </span>
                      ))}
                    </span>
                    <span className="block mt-1">Any unrecognised value defaults to <em className="font-semibold not-italic text-secondary-600">others</em>. Common keywords (e.g. "panel", "mount", "earth") are also auto-matched.</span>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="mt-0.5 w-6 h-6 rounded-md text-xs font-bold bg-primary-600 text-white shadow-sm flex-shrink-0 flex items-center justify-center">4</span>
                  <div className="text-xs text-secondary-500 leading-relaxed">
                    Click{' '}
                    <span className="inline-flex items-center gap-0.5 bg-secondary-100 border border-secondary-200 rounded px-1.5 py-0.5 font-semibold text-secondary-700 whitespace-nowrap">
                      📥 Import Excel
                    </span>
                    , review the preview, then choose{' '}
                    <em className="font-semibold not-italic text-secondary-600">Append</em>
                    {' '}(add to existing rows) or{' '}
                    <em className="font-semibold not-italic text-secondary-600">Replace all rows</em>.
                  </div>
                </li>

              </ol>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
