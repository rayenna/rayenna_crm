import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Costing Sheets',
    description: 'Build detailed line-item cost breakdowns for any project or product.',
    icon: '📊',
    to: '/costing',
    accent: 'border-l-primary-400',
  },
  {
    title: 'Bill of Materials',
    description: 'Manage parts, quantities, suppliers, and unit prices in one place.',
    icon: '🔩',
    to: '/bom',
    accent: 'border-l-yellow-500',
  },
  {
    title: 'AI Proposals',
    description: 'Generate professional client proposals with AI-assisted content.',
    icon: '🤖',
    to: '/proposal',
    accent: 'border-l-primary-300',
    soon: false,
  },
  {
    title: 'ROI Calculator',
    description: 'Calculate payback period, NPV, and return on investment automatically.',
    icon: '📈',
    to: '/roi',
    accent: 'border-l-yellow-400',
  },
];

export default function Dashboard() {
  return (
    <div>
      {/* Page card — mimics CRM PageCard */}
      <div className="bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 overflow-hidden backdrop-blur-sm mb-8">
        {/* Header strip */}
        <div className="px-6 py-5 sm:px-8 sm:py-6" style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/25 border border-white/40 shadow-lg backdrop-blur-md text-2xl leading-none">
              ⚡
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow">
                Proposal Engine
              </h1>
              <p className="mt-0.5 text-white/90 text-sm">
                Standalone module for solar costing, BOMs, AI proposals, and ROI
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 text-xs text-primary-700 bg-gradient-to-r from-white to-primary-50 px-3 py-1.5 rounded-full font-bold shadow border-2 border-white/50 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Proposal Engine Dev Environment Running
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {modules.map((m) => (
              <Link
                key={m.title}
                to={m.to}
                className={`relative bg-white rounded-xl border border-primary-100/60 border-l-4 ${m.accent} shadow-sm hover:shadow-md hover:border-primary-200/80 transition-all duration-200 p-5 group`}
              >
                {m.soon && (
                  <span className="absolute top-3 right-3 text-[10px] text-secondary-500 bg-secondary-100 px-2 py-0.5 rounded-full border border-secondary-200">
                    Soon
                  </span>
                )}
                <div className="text-2xl mb-3">{m.icon}</div>
                <h3 className="text-secondary-800 font-semibold text-sm mb-1 group-hover:text-primary-600 transition-colors">
                  {m.title}
                </h3>
                <p className="text-secondary-500 text-xs leading-relaxed">{m.description}</p>
              </Link>
            ))}
          </div>

          {/* Env status */}
          <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-xl shadow-sm border border-primary-100 p-5">
            <h2 className="text-secondary-700 font-semibold text-sm mb-4 uppercase tracking-wide">
              Environment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <EnvRow label="Frontend" value="localhost:5174" />
              <EnvRow label="Backend"  value="localhost:5001" />
              <EnvRow label="Database" value="SQLite · dev.db" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
      <div>
        <p className="text-secondary-400 text-xs uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-secondary-800 text-sm font-mono font-medium">{value}</p>
      </div>
    </div>
  );
}
