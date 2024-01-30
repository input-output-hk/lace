/* eslint-disable react/no-multi-comp */
import { Tooltip } from 'antd';
import cn from 'classnames';
import React, { useState } from 'react';
import { DownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button } from '@lace/common';
import { TranslationsFor } from '@src/ui/utils/types';
import { ReactComponent as BracketDown } from '../../assets/icons/bracket-down.component.svg';
import { DetailRows } from './components';
import styles from './TransactionInputOutput.module.scss';
import { TxDetails } from './types';

const rotateOpen: React.CSSProperties = {
  transform: 'rotate(180deg)',
  transition: 'transform .2s linear'
};

const rotateClose: React.CSSProperties = {
  transform: 'rotate(0deg)',
  transition: 'transform .2s linear'
};

interface TxDetailListProps<T extends string> {
  testId: string;
  title: string;
  subTitle: string;
  lists: TxDetails<T>[];
  translations: TranslationsFor<T>;
  tooltipContent?: React.ReactNode;
  withSeparatorLine?: boolean;
}

export const TxDetailList = <T extends string>({
  testId,
  title,
  subTitle,
  lists,
  tooltipContent,
  withSeparatorLine,
  translations
}: TxDetailListProps<T>): React.ReactElement => {
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
            <div key={`${testId}-list-${idx}`} className={cn({ [styles.topBorderContent]: idx > 0 })}>
              {lists.length > 1 && (
                <div key={`${testId}-list-header`} className={cn(styles.listHeader, styles.separatorLine)}>
                  <div className={styles.listHeaderTitle}>{`${subTitle} ${idx + 1}`}</div>
                </div>
              )}
              <DetailRows<T> translations={translations} testId={testId} list={list} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
