import { Link } from 'react-router-dom';
import { getActiveCustomer } from '../lib/customerStore';

/**
 * Sky strip used on Costing / BOM / ROI / Roof Layout / Customers / Proposal.
 * Shown only when a project is active so the user can jump back to Dashboard.
 */
export function ActiveCustomerBanner({ className = 'mb-5' }: { className?: string }) {
  const ac = getActiveCustomer();
  if (!ac) return null;

  return (
    <div className={`${className} rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 flex items-center justify-between gap-3`}>
      <p className="text-xs text-sky-700 min-w-0">
        <span className="font-semibold">Active customer:</span> {ac.master.name}
        {ac.master.location ? ` · ${ac.master.location}` : ''}
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
