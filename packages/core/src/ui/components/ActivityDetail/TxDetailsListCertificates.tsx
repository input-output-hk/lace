/* eslint-disable no-magic-numbers */
import React, { useState } from 'react';
import { Tooltip } from 'antd';
import cn from 'classnames';
import { Button } from '@lace/common';

import { InfoCircleOutlined, DownOutlined } from '@ant-design/icons';

import { ReactComponent as BracketDown } from '../../assets/icons/bracket-down.component.svg';
import styles from './TransactionInputOutput.module.scss';
import { DetailRowsCertificates } from './components';
import { TranslationsFor } from '@src/ui/utils/types';
import { TxDetails, TxDetailsCertificateTitles } from './types';

const rotateOpen: React.CSSProperties = {
  transform: 'rotate(180deg)',
  transition: 'transform .2s linear'
};

const rotateClose: React.CSSProperties = {
  transform: 'rotate(0deg)',
  transition: 'transform .2s linear'
};

interface TxDetailListCertificatesProps {
  testId: string;
  title: string;
  lists: TxDetails<TxDetailsCertificateTitles>[];
  translations: TranslationsFor<TxDetailsCertificateTitles>;
  tooltipContent?: React.ReactNode;
  withSeparatorLine?: boolean;
}

export const TxDetailListCertificates = ({
  testId,
  title,
  lists,
  tooltipContent,
  withSeparatorLine,
  translations
}: TxDetailListCertificatesProps): React.ReactElement => {
  const [isVisible, setIsVisible] = useState<boolean>();

  const animation = isVisible ? rotateOpen : rotateClose;
  const Icon = BracketDown ? <BracketDown className={styles.bracket} style={{ ...animation }} /> : <DownOutlined />;

  return (
    <div data-testid={testId} className={cn(styles.transactionInOut, { [styles.separatorLine]: withSeparatorLine })}>
      <div className={styles.expanderHeader}>
        <div className={styles.title}>
          <span>{title}</span>
          {tooltipContent && (
            <Tooltip title={tooltipContent}>
              <InfoCircleOutlined className={styles.infoIcon} />
            </Tooltip>
          )}
        </div>

        <Button
          variant="outlined"
          color="secondary"
          onClick={() => setIsVisible((visible) => !visible)}
          data-testid={`${testId}_toggle`}
          icon={Icon}
          className={styles.arrowBtn}
        />
      </div>
      {isVisible && (
        <div className={styles.txInOutContent} data-testid={`${testId}-lists`}>
          {lists.map((list, idx) => (
            <div key={`${testId}-list-${idx}`} className={idx > 0 && styles.topBorderContent}>
              <DetailRowsCertificates translations={translations} testId={testId} list={list} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
