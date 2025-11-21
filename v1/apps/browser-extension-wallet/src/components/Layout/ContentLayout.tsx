import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from 'antd';
import cn from 'classnames';
import { useHasScrollBar } from '@lace/common';
import { walletRoutePaths } from '@routes/wallet-paths';
import { SectionTitle, SectionTitleProps } from './SectionTitle';
import { Credit } from '@components/Credit';
import { COINGECKO_URL } from '@utils/constants';
import styles from './ContentLayout.module.scss';

export type LayoutProps = {
  children: React.ReactNode;
  title?: string | React.ReactElement;
  titleSideText?: string | React.ReactElement;
  isLoading?: boolean;
  footer?: React.ReactNode;
  id?: string;
  mainClassName?: string;
  'data-testid'?: string;
  hasCredit?: boolean;
} & Omit<SectionTitleProps, 'title' | 'sideText'>;

export const CONTENT_LAYOUT_ID = 'contentLayout';

const openExternalLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

export const ContentLayout = ({
  title,
  children,
  withIcon,
  handleIconClick,
  isLoading,
  id = CONTENT_LAYOUT_ID,
  titleSideText,
  mainClassName,
  hasCredit = false,
  ...rest
}: LayoutProps): React.ReactElement => {
  const location = useLocation<{ pathname: string }>();
  const mvpStyledRoutes = new Set([walletRoutePaths.addressBook, walletRoutePaths.earn]);
  const isMvpStyledRoute = mvpStyledRoutes.has(location?.pathname);

  const scrollabelContainer = useRef();
  const [hasScrollBar, setHasScrollBar] = useState<boolean>(false);
  useHasScrollBar(scrollabelContainer, setHasScrollBar);

  const content = (
    <>
      {typeof title === 'string' ? (
        <SectionTitle
          isPopup
          title={title}
          withIcon={withIcon}
          handleIconClick={handleIconClick}
          sideText={titleSideText}
          data-testid={rest['data-testid']}
        />
      ) : (
        title
      )}
      {isLoading ? (
        <div className={styles.spinnerContainer}>
          <Skeleton data-testid="content-layout-spinner" />
        </div>
      ) : (
        <main
          className={cn(styles.MainContainer, { [mainClassName]: mainClassName, [styles.hasScrollBar]: hasScrollBar })}
        >
          {children}
          {hasCredit && <Credit handleOnClick={() => openExternalLink(COINGECKO_URL)} />}
        </main>
      )}
    </>
  );

  return (
    <div className={cn(styles.wrapper, { [styles.hasScrollBar]: hasScrollBar })}>
      <div
        ref={scrollabelContainer}
        id={id}
        data-testid="content-layout"
        className={cn(styles.content, { [styles.white]: isMvpStyledRoute })}
      >
        {content}
      </div>
    </div>
  );
};
