import React, { useCallback, useRef, useState } from 'react';
import cn from 'classnames';
import { Drawer as AntDrawer, DrawerProps as AntDrawerProps } from 'antd';
import styles from './Drawer.module.scss';
import { useHasScrollBar } from '@src/ui/hooks';

export type DrawerProps = {
  children: React.ReactNode;
  navigation?: React.ReactNode;
  popupView?: boolean;
  scrollableContentClassName?: string;
  dataTestId?: string;
} & AntDrawerProps;

const DRAWER_CONTENT_WIDTH = 664;
const DRAWER_MARGIN = 24;
const DRAWER_MARGINS = 2;
const DRAWER_WIDTH = DRAWER_CONTENT_WIDTH + DRAWER_MARGIN * DRAWER_MARGINS;

export const Drawer = ({
  children,
  className,
  scrollableContentClassName,
  popupView,
  title,
  footer,
  navigation,
  width = DRAWER_WIDTH,
  keyboard = true,
  destroyOnClose = true,
  dataTestId = 'custom-drawer',
  ...rest
}: DrawerProps): React.ReactElement => {
  const scrollableContainerRef = useRef(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const onChangeScrollBarVisibility = useCallback((hasScrollBar: boolean) => {
    setIsScrollable(hasScrollBar);
  }, []);

  useHasScrollBar(scrollableContainerRef, onChangeScrollBarVisibility);

  return (
    <AntDrawer
      data-testid={dataTestId}
      className={cn(styles.customDrawer, {
        [styles.popupView]: popupView,
        ...(className && { [className]: className }),
        [styles.browserView]: !popupView
      })}
      size="large"
      width={popupView ? '100%' : width}
      destroyOnClose={destroyOnClose}
      {...rest}
      // Hides default antd X icon
      closable={false}
      keyboard={keyboard}
    >
      {navigation}
      <div className={styles.content} data-testid="drawer-content">
        <div
          id="drawer-scrollable-content"
          data-testid="drawer-scrollable-content"
          ref={scrollableContainerRef}
          className={cn(styles.scrollableContent, {
            ...(scrollableContentClassName && { [scrollableContentClassName]: scrollableContentClassName }),
            [styles.nonScrollableContent]: !isScrollable
          })}
        >
          {title}
          {/* React.cloneElement would fail if children is not a single element */}
          {children && React.cloneElement(children as React.ReactElement, { scrollableContainerRef })}
        </div>
      </div>
      {footer && (
        <div className={styles.footer} data-testid="drawer-footer">
          {footer}
        </div>
      )}
    </AntDrawer>
  );
};
