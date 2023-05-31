import { useEffect, useState } from 'react';

export const useIsSmallerScreenWidthThan = (breakpoint: number): boolean => {
  const [isSmallerScreen, setIsSmallerScreen] = useState(window.innerWidth <= breakpoint);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handleMatchMediaChangeEvent = (e: MediaQueryListEvent) => setIsSmallerScreen(!e.matches);
    media.addEventListener('change', handleMatchMediaChangeEvent);
    return () => {
      media.removeEventListener('change', handleMatchMediaChangeEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return isSmallerScreen;
};
