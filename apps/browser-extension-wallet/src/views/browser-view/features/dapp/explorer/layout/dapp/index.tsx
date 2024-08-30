import { IogContainer } from '../../components/Container';
import { withDrawer } from '../../components/ProjectDetail/with-drawer';
import * as React from 'react';
import styles from './styles.module.scss';
import type { IDappLayoutProps } from './types';
import { Footer } from '../Footer';

const DappLayout: React.FC<IDappLayoutProps> = ({ children }) => (
  <main className={styles.iogDappLayout}>
    <IogContainer className={styles.container}>
      <div className={styles.videoWrapper}>
        <video autoPlay loop muted className={styles.video}>
          <source src="./banner.mp4" type="video/mp4" />
        </video>
      </div>
      <div className={styles.contentWrapper}>{children}</div>
      <Footer />
    </IogContainer>
  </main>
);

export default withDrawer(DappLayout);
