import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  TIPS,
  getTipForToday,
  shouldShowTip,
  markTipShown,
  markDontShowAgain,
} from '../data/tipOfTheDay';

const TipOfTheDay = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const [show, setShow] = useState(false);
  const [tip,  setTip]  = useState('');

  useEffect(() => {
    const forceShow = searchParams.get('showTip') === '1';
    if (forceShow || shouldShowTip()) {
      setTip(getTipForToday());
      setShow(true);
    }
  }, [searchParams]);

  const clearShowTipFromUrl = () => {
    if (searchParams.get('showTip') !== '1') return;
    const params = new URLSearchParams(location.search);
    params.delete('showTip');
    const newSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: newSearch ? `?${newSearch}` : '' },
      { replace: true },
    );
  };

  const handleGotIt = () => {
    markTipShown();
    setShow(false);
    clearShowTipFromUrl();
  };

  const handleDontShowAgain = () => {
    markDontShowAgain();
    setShow(false);
    clearShowTipFromUrl();
  };

  const handleNextTip = () => {
    const idx     = TIPS.indexOf(tip);
    const nextIdx = idx >= 0 ? (idx + 1) % TIPS.length : 0;
    setTip(TIPS[nextIdx]);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border-2 border-primary-200 overflow-hidden">
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848, #eab308)' }}
        >
          <span className="text-2xl" aria-hidden>💡</span>
          <h3 className="text-lg font-bold text-white">Tip of the Day</h3>
          <span className="ml-auto text-xs text-white/60 font-medium">
            {TIPS.indexOf(tip) + 1} / {TIPS.length}
          </span>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
            {tip}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:items-center">
          <button
            onClick={handleDontShowAgain}
            className="text-xs sm:text-sm text-gray-400 hover:text-gray-600 transition-colors sm:mr-auto"
          >
            Don&apos;t show again
          </button>
          <div className="flex gap-2 sm:justify-end">
            <button
              onClick={handleNextTip}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Next Tip
            </button>
            <button
              onClick={handleGotIt}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(to right, #0d1b3a, #1e2848)' }}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipOfTheDay;
