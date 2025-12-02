import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import { useLayoutEffect, useState } from 'react';

export type BoundingBox = Omit<DOMRect, 'toJSON'>;

const toBoundingBox = (rect: DOMRect): BoundingBox =>
  pick(rect, ['height', 'width', 'x', 'y', 'bottom', 'left', 'right', 'top']);

export const useBoundingBox = (element?: HTMLElement): BoundingBox | undefined => {
  const [box, setBox] = useState<BoundingBox | undefined>(() =>
    element ? toBoundingBox(element.getBoundingClientRect()) : undefined
  );

  useLayoutEffect(() => {
    if (!element) return;

    const handleElementChange = () => {
      const newBox = toBoundingBox(element.getBoundingClientRect());

      if (isEqual(newBox, box)) return;

      setBox(newBox);
    };

    handleElementChange();

    if (!window?.ResizeObserver) return;

    const resizeObserver = new ResizeObserver(handleElementChange);

    resizeObserver.observe(element);

    // eslint-disable-next-line consistent-return
    return () => {
      resizeObserver.disconnect();
    };
  }, [box, element]);

  return box;
};
