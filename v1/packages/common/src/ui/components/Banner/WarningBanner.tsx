import React, { ReactElement } from 'react';
import { ReactComponent as WarningIcon } from '../../assets/icons/red-warning-icon.component.svg';
import styles from './WarningBanner.module.scss';
import { Banner } from './Banner';

export const WarningBanner = ({ message }: { message: string }): ReactElement => (
  <Banner
    message={<div className={styles.message}>{message}</div>}
    withIcon
    customIcon={<WarningIcon className={styles.icon} />}
  />
);
