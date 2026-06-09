import { useEffect, useState } from 'react';

/** Mobile (<768px) and narrow (<1024px) breakpoint listeners for layout chrome. */
export function useRoofLayoutViewport() {
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (window.innerWidth >= 1024) setMobileControlsOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return {
    isMobileView,
    isNarrowViewport,
    mobileControlsOpen,
    setMobileControlsOpen,
  };
}
