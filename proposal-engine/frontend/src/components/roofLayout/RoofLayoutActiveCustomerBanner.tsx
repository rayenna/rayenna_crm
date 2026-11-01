import { Link } from 'react-router-dom';
import { getActiveCustomer, getResolvedRoofLayout } from '../../lib/customerStore';

/** CRM Sales & Commercial radio labels — omit when the project has no type. */
function crmSystemTypeLabel(raw?: string): string | null {
  const key = (raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  if (key === 'OFF_GRID' || key === 'OFFGRID') return 'Off-Grid';
  if (key === 'HYBRID') return 'Hybrid';
  if (key === 'ON_GRID' || key === 'ONGRID') return 'On-Grid';
  return raw!.trim();
}

/** CRM Project panel type (DCR / Non-DCR). */
function crmPanelTypeLabel(raw?: string): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const key = s.toUpperCase().replace(/[\s_-]+/g, '');
  if (key === 'DCR') return 'DCR';
  if (key === 'NONDCR' || key === 'NDCR') return 'Non-DCR';
  return s;
}

export function RoofLayoutActiveCustomerBanner() {
  const ac = getActiveCustomer();
  const roofSaved = ac ? !!getResolvedRoofLayout(ac) : false;

  if (ac) {
    const bits: string[] = [];
    if (typeof ac.master.systemSizeKw === 'number' && ac.master.systemSizeKw > 0) {
      bits.push(`${ac.master.systemSizeKw} kW`);
    }
    const systemType = crmSystemTypeLabel(ac.master.systemType);
    if (systemType) bits.push(systemType);
    const panelType = crmPanelTypeLabel(ac.master.panelType);
    if (panelType) bits.push(panelType);

    return (
      <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-xs text-sky-700 min-w-0">
          <span className="font-semibold">Active customer:</span> {ac.master.name}
          {bits.length > 0 ? ` · ${bits.join(' · ')}` : ''}
          {roofSaved && (
            <span className="ml-2 text-emerald-600 font-medium">· Roof layout saved ✓</span>
          )}
        </p>
        <Link
          to="/dashboard"
          className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap flex-shrink-0 transition-colors"
        >
          View Dashboard →
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center justify-between gap-3">
      <p className="text-xs text-amber-700">
        No active customer. Open a project from Customers or Dashboard to use AI roof layout.
      </p>
      <Link
        to="/customers"
        className="text-xs text-amber-700 hover:text-amber-900 font-semibold border border-amber-300 hover:bg-amber-100 px-3 py-1 rounded-lg transition-colors whitespace-nowrap"
      >
        Select Customer →
      </Link>
    </div>
  );
}
