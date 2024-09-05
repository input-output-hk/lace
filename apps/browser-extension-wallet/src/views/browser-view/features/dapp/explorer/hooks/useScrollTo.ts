import { useEffect } from 'react';

const DEFAULT_OFFSET = 100;

const useScrollTo = (selector: string, condition: any, offset = DEFAULT_OFFSET) => {
  useEffect(() => {
    const el = document.querySelector(selector);
    if (el) {
      (el as HTMLElement).style.scrollBehavior = 'smooth';
      el.scrollTop = offset;
    }
  }, [condition]);
};

export default useScrollTo;
