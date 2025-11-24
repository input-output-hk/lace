/* eslint-disable react/no-multi-comp */
import React, { ReactNode } from 'react';
import ExpandIcon from '../../assets/icons/expand.component.svg';
import classnames from 'classnames';
import { Tooltip } from 'antd';

import styles from './ExpandButton.module.scss';

const RenderTooltipIfMultiWallet = ({ children, label }: { children: ReactNode; label: string }) => {
  if (process.env.USE_MULTI_WALLET === 'true') {
    return <Tooltip title={label}>{children}</Tooltip>;
  }

  return <>{children}</>;
};

export const ExpandButton = ({ label, onClick }: { label: string; onClick: () => void }): React.ReactElement => (
  <RenderTooltipIfMultiWallet label={label}>
    <span
      onClick={onClick}
      className={classnames(styles.button, {
        [styles.multiWallet]: process.env.USE_MULTI_WALLET === 'true'
      })}
      data-testid="expand-button"
    >
      <ExpandIcon className={styles.icon} />
      {process.env.USE_MULTI_WALLET !== 'true' && <span className={styles.text}>{label}</span>}
    </span>
  </RenderTooltipIfMultiWallet>
);
