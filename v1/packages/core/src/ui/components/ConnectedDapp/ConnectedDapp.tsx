import React from 'react';
import Icon from '@ant-design/icons';
import styles from './ConnectedDapp.module.scss';
import { Avatar } from 'antd';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete-icon.component.svg';

export const DAPP_CONTAINER_TESTID = 'dapp-container-id';
export const LOGO_TESTID = 'connected-dapp-logo';
export const DELETE_ICON_TESTID = 'dapp-delete-icon-id';

type DappInfo = {
  name: string;
  logo: string;
  url: string;
};

export type connectedDappProps = DappInfo & {
  onDelete: () => void;
  popupView?: boolean;
};

export const ConnectedDapp = ({ name, url, logo, onDelete }: connectedDappProps): React.ReactElement => (
  <div className={styles.dapp} data-testid={DAPP_CONTAINER_TESTID}>
    <div className={styles.imageContainer}>
      <Avatar className={styles.logo} alt="connected-dapp-logo" data-testid={LOGO_TESTID} src={logo} />
    </div>
    <div className={styles.body}>
      <div data-testid="connected-dapp-name" className={styles.name}>
        {name}
      </div>
      <div data-testid="connected-dapp-url" className={styles.url}>
        <div>{url}</div>
      </div>
    </div>
    <div className={styles.actions}>
      <Icon className={styles.delete} component={DeleteIcon} onClick={onDelete} data-testid={DELETE_ICON_TESTID} />
    </div>
  </div>
);
