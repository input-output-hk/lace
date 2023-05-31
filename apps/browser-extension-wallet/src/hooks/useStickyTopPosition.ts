import { useState, useEffect } from 'react';

export const useStickyTopPosition = (childHeight: { offsetTop: number }): number => {
  const [top, setTop] = useState(0);
  useEffect(() => {
    const mainContainer = document.querySelector('#main');
    const sidePanel = document.querySelector('#side-panel');
    const setSidePanelPositionOnScroll = () => {
      const offsetTop = childHeight?.offsetTop || mainContainer?.getBoundingClientRect()?.top || 0;
      const childHeightDifference = offsetTop - sidePanel?.getBoundingClientRect()?.top || 0;
      if (!Number.isNaN(childHeightDifference) && childHeightDifference > 0) setTop(childHeightDifference);
    };

    mainContainer.addEventListener('scroll', setSidePanelPositionOnScroll);
    return () => mainContainer.removeEventListener('scroll', setSidePanelPositionOnScroll);
  }, [childHeight?.offsetTop]);

  return top;
};
