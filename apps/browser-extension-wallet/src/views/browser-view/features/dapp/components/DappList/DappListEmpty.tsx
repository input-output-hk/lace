/* eslint-disable no-magic-numbers */
import React from 'react';
import { Image } from 'antd';
import { useTranslation } from 'react-i18next';
import Empty from '../../../../../../assets/icons/empty.svg';
import styles from './DappListEmpty.module.scss';

export type dappListEmptyProps = {
  title?: string | React.ReactElement;
};

export const DappListEmpty = ({ title }: dappListEmptyProps): React.ReactElement => {
  const { t: translate } = useTranslation();

  return (
    <div data-testid="dapp-list-empty" className={styles.container}>
      <Image data-testid="dapp-list-empty-image" preview={false} width={120} src={Empty} />
      <div data-testid="dapp-list-empty-text" className={styles.text}>
        {title || translate('dapp.list.empty.text')}
      </div>
    </div>
  );
};
