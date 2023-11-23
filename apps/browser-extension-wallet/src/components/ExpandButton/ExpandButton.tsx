import React from 'react';
import ExpandIcon from '../../assets/icons/expand.component.svg';
import classnames from 'classnames';

import styles from './ExpandButton.module.scss';

export const ExpandButton = ({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement => (
  <a
    onClick={onClick}
    href="#"
    className={classnames(styles.button, {
      [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true'
    })}
    data-testid="expand-button"
  >
    <ExpandIcon className={styles.icon} />
    <span className={styles.text}>{label}</span>
  </a>
);
