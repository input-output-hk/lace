import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

export const useVisibleItemsCount = ({
  rowHeight,
  containerRef,
}: Readonly<{
  rowHeight: number;
  containerRef: RefObject<HTMLElement | null>;
}>): number | undefined => {
  const [initialItemsLimit, setInitialItemsLimit] = useState<
    number | undefined
  >();

  useLayoutEffect(() => {
    if (containerRef.current !== null) {
      const tableVisiblePartHeight =
        window.innerHeight - containerRef.current.getBoundingClientRect().top;
      console.log(
        rowHeight,
        window.innerHeight,
        containerRef.current.getBoundingClientRect().top,
      );
      setInitialItemsLimit(Math.ceil(tableVisiblePartHeight / rowHeight));
    }
  }, [rowHeight, containerRef]);

  return initialItemsLimit;
};
