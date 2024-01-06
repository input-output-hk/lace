/* eslint-disable no-magic-numbers */
import { Tooltip } from 'antd';
import cn from 'classnames';
import React, { useState } from 'react';
import { DownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button } from '@lace/common';
import { TranslationsFor } from '@src/ui/utils/types';
import { ReactComponent as BracketDown } from '../../assets/icons/bracket-down.component.svg';
import { DetailRowsVotes } from './components';
import styles from './TransactionInputOutput.module.scss';
import { TxDetails, TxDetailsVotingProceduresTitles } from './types';

const rotateOpen: React.CSSProperties = {
  transform: 'rotate(180deg)',
  transition: 'transform .2s linear'
};

const rotateClose: React.CSSProperties = {
  transform: 'rotate(0deg)',
  transition: 'transform .2s linear'
};

export interface TxDetailListVoteProps {
  testId: string;
  title: string;
  lists: TxDetails<TxDetailsVotingProceduresTitles>[];
  translations: TranslationsFor<TxDetailsVotingProceduresTitles>;
  tooltipContent?: React.ReactNode;
  withSeparatorLine?: boolean;
}

export const TxDetailListVotes = ({
  testId,
  title,
  lists,
  tooltipContent,
  withSeparatorLine,
  translations
}: TxDetailListVoteProps): React.ReactElement => {
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
              <DetailRowsVotes translations={translations} testId={testId} list={list} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
