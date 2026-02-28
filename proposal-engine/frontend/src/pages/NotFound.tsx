import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center bg-gradient-to-br from-white via-primary-50/40 to-white shadow-2xl rounded-2xl border-2 border-primary-200/50 px-12 py-14 backdrop-blur-sm">
        <p className="text-6xl font-extrabold text-primary-200 mb-4">404</p>
        <p className="text-secondary-600 mb-6 font-medium">Page not found in Proposal Engine</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
