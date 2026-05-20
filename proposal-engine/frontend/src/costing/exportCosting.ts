import type { LineItem } from '../lib/costingConstants';
import { toNum } from './format';

export async function exportCostingXlsx(items: LineItem[], sheetName: string, showGst: boolean, marginPercent: number) {
  const XLSX = await import('xlsx');
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

export function exportCostingCsv(items: LineItem[], sheetName: string, showGst: boolean, marginPercent: number) {
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
