import React from 'react';
import styles from './SectionLayout.modules.scss';
import { SidePanel } from './SidePanel';
import { useExternalLinkOpener } from '@providers';
import { Credit } from '@components/Credit';
import { COINGECKO_URL } from '@utils/constants';
import classNames from 'classnames';

export const CONTENT_ID = 'content';

interface SectionLayoutProps {
  children: React.ReactNode;
  sidePanelContent?: React.ReactNode;
  isSidePanelFixed?: boolean;
  hasCredit?: boolean;
}

export const SectionLayout = ({
  children,
  sidePanelContent,
  isSidePanelFixed = true,
  hasCredit = false
}: SectionLayoutProps): React.ReactElement => {
  const openExternalLink = useExternalLinkOpener();
  const handleOnClick = () => openExternalLink(COINGECKO_URL);

  return (
    <>
      <main id={CONTENT_ID} className={classNames(styles.content, !!sidePanelContent && styles.withAside)}>
        <div>{children}</div>
        {hasCredit && <Credit handleOnClick={handleOnClick} />}
      </main>
      <SidePanel sidePanelContent={sidePanelContent} isSidePanelFixed={isSidePanelFixed} />
    </>
  );
};
