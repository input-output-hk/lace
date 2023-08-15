import React from 'react';

import styles from '../../UserMenu/components/UserMenu.module.scss';

interface Props {
  children: React.ReactNode;
}

export const Links = ({ children }: Props): React.ReactElement => <div className={styles.links}>{children}</div>;
