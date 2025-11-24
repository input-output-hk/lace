/* eslint-disable unicorn/no-null */
import type { RefObject } from 'react';
import React from 'react';

import { Scrollbars } from './scrollbar';

export interface CustomScrollbarsProps {
  onScroll?: React.UIEventHandler;
  children?: React.ReactNode;
  forwardedRef:
    | React.ForwardedRef<unknown>
    | ((ref: RefObject<any> | null) => void);
  style?: React.CSSProperties;
}

export const CustomScrollbars = ({
  onScroll,
  forwardedRef,
  style,
  children,
}: Readonly<CustomScrollbarsProps>) => {
  const refSetter = React.useCallback(scrollbarsRef => {
    if (typeof forwardedRef === 'function') {
      scrollbarsRef ? forwardedRef(scrollbarsRef.view) : forwardedRef(null);
    }
  }, []);

  return (
    <Scrollbars
      ref={refSetter}
      style={{ ...style, overflow: 'hidden', marginRight: 4 }}
      onScroll={onScroll}
    >
      {children}
    </Scrollbars>
  );
};

export const CustomScrollbarsVirtualList = React.forwardRef((props, ref) => (
  <CustomScrollbars {...props} forwardedRef={ref} />
));
