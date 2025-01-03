import { withDrawer } from '../../components/ProjectDetail/with-drawer';
import bannerVideo from './banner.mp4';
import * as React from 'react';
import styles from './styles.module.scss';
import type { IDappLayoutProps } from './types';

const bannerVideoSrc = (typeof chrome !== 'undefined' && chrome.runtime?.getURL('banner.mp4')) || bannerVideo;

const DappLayout: React.FC<IDappLayoutProps> = ({ children }) => (
  <main className={styles.iogDappLayout}>
    <div className={styles.videoWrapper}>
      <video autoPlay loop muted className={styles.video}>
        <source src={bannerVideoSrc} type="video/mp4" />
      </video>
    </div>
    <div className={styles.contentWrapper}>{children}</div>
  </main>
);

export default withDrawer(DappLayout);
