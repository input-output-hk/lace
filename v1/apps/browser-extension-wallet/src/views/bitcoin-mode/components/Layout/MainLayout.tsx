import React from 'react';
import { MainFooter, MainHeader } from '../MainMenu';
import styles from './MainLayout.module.scss';
import { SimpleHeader } from '../MainMenu/SimpleHeader';
import { PrivacyPolicyUpdate } from '@components/PrivacyPolicyUpdate/PrivacyPolicyUpdate';

interface MainLayoutProps {
  children: React.ReactNode;
  useSimpleHeader?: boolean;
  hideFooter?: boolean;
}

export const extensionScrollableContainerID = 'extensionScrollable';

// TODO: fix styles. with html tag the coin and activity list disappear,
//       same if the children is wrapped with ion-content.
//       the fragment fix this but is positioning everything at the bottom.
//       redo with antd
export const MainLayout = ({ children, useSimpleHeader = false, hideFooter }: MainLayoutProps): React.ReactElement => (
  <div className={styles.layoutContainer}>
    <div className={styles.layoutContent}>
      <div className={styles.contentWrapper}>
        {useSimpleHeader ? <SimpleHeader /> : <MainHeader />}
        <div id={extensionScrollableContainerID} className={styles.content}>
          {children}
        </div>
      </div>
    </div>
    <PrivacyPolicyUpdate />
    {!hideFooter && <MainFooter />}
  </div>
);
