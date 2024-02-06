import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

export const useVisibleItemsCount = ({
  rowHeight,
  containerRef,
}: Readonly<{
  rowHeight: number;
  containerRef: RefObject<HTMLElement | null>;
}>): number | undefined => {
  const [visibleItemsCount, setVisibleItemsCount] = useState<
    number | undefined
  >();

  useLayoutEffect(() => {
    if (containerRef.current === null) return;
    const tableVisiblePartHeight =
      window.innerHeight - containerRef.current.getBoundingClientRect().top;
    setVisibleItemsCount(Math.ceil(tableVisiblePartHeight / rowHeight));
  }, [rowHeight, containerRef]);

  return visibleItemsCount;
};
