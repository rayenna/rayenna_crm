const modules = [
  {
    title: 'Costing Sheets',
    description: 'Build detailed line-item cost breakdowns for any project or product.',
    icon: '📊',
    color: 'from-blue-600 to-blue-800',
  },
  {
    title: 'Bill of Materials',
    description: 'Manage parts, quantities, suppliers, and unit prices in one place.',
    icon: '🔩',
    color: 'from-violet-600 to-violet-800',
  },
  {
    title: 'AI Proposals',
    description: 'Generate professional client proposals with AI-assisted content.',
    icon: '🤖',
    color: 'from-emerald-600 to-emerald-800',
    soon: true,
  },
  {
    title: 'ROI Calculator',
    description: 'Calculate payback period, NPV, and return on investment automatically.',
    icon: '📈',
    color: 'from-amber-600 to-amber-800',
  },
];

export default function Dashboard() {
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/50 px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-pulse" />
          Proposal Engine Dev Environment Running
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-white mb-3 tracking-tight">Proposal Engine</h1>
        <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
          Standalone module for solar costing sheets, BOMs, AI proposals, and ROI — fully
          isolated from the main CRM.
        </p>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        {modules.map((m) => (
          <div
            key={m.title}
            className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
          >
            {m.soon && (
              <span className="absolute top-4 right-4 text-[10px] text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                Soon
              </span>
            )}
            <div
              className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}
            >
              {m.icon}
            </div>
            <h3 className="text-white font-semibold text-sm mb-1">{m.title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed">{m.description}</p>
          </div>
        ))}
      </div>

      {/* Env status */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-medium text-sm mb-5">Environment</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <EnvRow label="Frontend" value="localhost:5174" />
          <EnvRow label="Backend"  value="localhost:5001" />
          <EnvRow label="Database" value="SQLite · dev.db" />
        </div>
      </div>
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-white text-sm font-mono">{value}</p>
      </div>
    </div>
  );
}
