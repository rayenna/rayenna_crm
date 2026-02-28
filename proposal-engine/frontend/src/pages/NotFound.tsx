import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-700 mb-4">404</p>
        <p className="text-gray-400 mb-6">Page not found in Proposal Engine</p>
        <Link
          to="/"
          className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-4"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
