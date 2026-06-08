import { Link } from 'react-router-dom';
import { getActiveCustomer, getResolvedRoofLayout } from '../../lib/customerStore';

export function RoofLayoutActiveCustomerBanner() {
  const ac = getActiveCustomer();
  const roofSaved = ac ? !!getResolvedRoofLayout(ac) : false;

  if (ac) {
    return (
      <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-xs text-sky-700">
          <span className="font-semibold">Active customer:</span> {ac.master.name}
          {roofSaved && (
            <span className="ml-2 text-emerald-600 font-medium">· Roof layout saved ✓</span>
          )}
        </p>
        <Link
          to="/"
          className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap transition-colors"
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
