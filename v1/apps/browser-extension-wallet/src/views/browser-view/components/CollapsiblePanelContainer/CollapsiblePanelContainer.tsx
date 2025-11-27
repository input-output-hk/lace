import React from 'react';
import styles from './CollapsiblePanelContainer.module.scss';

interface CollapsiblePanelContainerProps {
  children: React.ReactNode;
  topNavigation: React.ReactNode;
  onOverlayClick?: () => void;
}

export const CollapsiblePanelContainer = ({
  children,
  topNavigation,
  onOverlayClick
}: CollapsiblePanelContainerProps): React.ReactElement => (
  <div className={styles.overlay} onClick={onOverlayClick}>
    <div className={styles.stickyTopNavigation}>{topNavigation}</div>
    <div data-testid="right-side-panel" className={styles.container} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);
