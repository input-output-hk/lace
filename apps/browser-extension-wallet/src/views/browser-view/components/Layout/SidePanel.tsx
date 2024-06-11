/* eslint-disable react/no-multi-comp */
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import IntersectionObserver from 'intersection-observer-polyfill';
import classnames from 'classnames';
import { useIsSmallerScreenWidthThan } from '@hooks/useIsSmallerScreenWidthThan';
import { DropdownMenu } from '@components/DropdownMenu';
import { SendReceiveBox } from '../SendReceiveBox';
import styles from './SectionLayout.modules.scss';
import { SidePanelButton } from '../SidePanelButton/SidePanelButton';
import { CollapsiblePanelContainer } from '../CollapsiblePanelContainer/CollapsiblePanelContainer';
import { BREAKPOINT_SMALL } from '@src/styles/constants';
import { TutorialContext } from '../../features/tutorial';

export const CONTENT_ID = 'content';

const intersectionObserverInit: IntersectionObserverInit = { threshold: 1 };

interface SectionLayoutProps {
  sidePanelContent: React.ReactNode;
  isSidePanelFixed?: boolean;
}

const STYCKY_DIRECTION_TOP = 'top';
const STYCKY_DIRECTION_BOTTOM = 'bottom';

export const SidePanel = ({ sidePanelContent, isSidePanelFixed = true }: SectionLayoutProps): React.ReactElement => {
  const sidePanelRef = useRef();
  const [stickyDirection, setStickyDirection] = useState(STYCKY_DIRECTION_TOP);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const isScreenTooSmallForSidePanel = useIsSmallerScreenWidthThan(BREAKPOINT_SMALL);

  const observerCb = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.map((entry) => {
      if (!sidePanelRef.current) return;
      if (entry.intersectionRect.height === entry.boundingClientRect.height) {
        setStickyDirection(STYCKY_DIRECTION_TOP);
      } else {
        setStickyDirection(STYCKY_DIRECTION_BOTTOM);
      }
    });
  }, []);

  useEffect(() => {
    const target = sidePanelRef?.current;
    const observer = new IntersectionObserver(observerCb, intersectionObserverInit);
    if (target && isSidePanelFixed) {
      observer.observe(target);
    }
    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [observerCb, isSidePanelFixed]);

  const toggleSidePanelVisibility = (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e?.stopPropagation();
    setIsPanelVisible((prev) => !prev);
  };

  const { refs } = useContext(TutorialContext);

  const topNavigation = (
    <div
      className={classnames(styles.navigationBox, {
        [styles.navigationBoxOverlay]: isPanelVisible && isScreenTooSmallForSidePanel,
        [styles.navigationBoxFlexible]: process.env.USE_MULTI_WALLET === 'true'
      })}
    >
      <SendReceiveBox />
      <DropdownMenu ref={refs?.[6]} />
      {isScreenTooSmallForSidePanel && <SidePanelButton active={isPanelVisible} onClick={toggleSidePanelVisibility} />}
    </div>
  );

  return (
    <aside
      id="side-panel"
      className={classnames(styles.sidePanelContainer, styles[stickyDirection], {
        [styles.stickyAside]: isSidePanelFixed
      })}
    >
      {isScreenTooSmallForSidePanel && isPanelVisible ? (
        <CollapsiblePanelContainer onOverlayClick={toggleSidePanelVisibility} topNavigation={topNavigation}>
          {sidePanelContent}
        </CollapsiblePanelContainer>
      ) : (
        <div
          ref={sidePanelRef}
          className={classnames(styles[stickyDirection], {
            [styles.stickyAsideInner]: isSidePanelFixed,
            [styles.topBarAlignment]: isScreenTooSmallForSidePanel
          })}
        >
          {process.env.USE_MULTI_WALLET === 'true' ? (
            <>
              <div className={styles.topNavigationBox}>{topNavigation}</div>
              {!isScreenTooSmallForSidePanel && <div className={styles.sidePanelContentBox}>{sidePanelContent}</div>}
            </>
          ) : (
            <>
              {topNavigation}
              {!isScreenTooSmallForSidePanel && sidePanelContent}
            </>
          )}
        </div>
      )}
    </aside>
  );
};
