import { withDrawer } from '../../components/ProjectDetail/with-drawer';
import * as React from 'react';
import styles from './styles.module.scss';
import type { IDappLayoutProps } from './types';

const DappLayout: React.FC<IDappLayoutProps> = ({ children }) => (
  <div className={styles.iogDappLayout}>
    <div className={styles.contentWrapper}>{children}</div>
  </div>
);

export default withDrawer(DappLayout);
