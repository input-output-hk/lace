/* eslint-disable react/no-multi-comp */
import { Tooltip } from 'antd';
import cn from 'classnames';
import React, { useState } from 'react';
import { DownOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button } from '@lace/common';
import { ReactComponent as BracketDown } from '../../assets/icons/bracket-down.component.svg';
import styles from './TransactionInputOutput.module.scss';
import { Text } from '@lace/ui';

interface TxDetailsGroupProps {
  testId: string;
  title: string;
  children: React.ReactNode;
  tooltipContent?: React.ReactNode;
  withSeparatorLine?: boolean;
}

export const TxDetailsGroup = ({
  testId,
  title,
  children,
  tooltipContent,
  withSeparatorLine
}: TxDetailsGroupProps): React.ReactElement => {
  const [isVisible, setIsVisible] = useState<boolean>();

  const Icon = BracketDown ? (
    <BracketDown
      className={cn(styles.bracket, {
        [styles.rotateOpen]: isVisible,
        [styles.rotateClose]: !isVisible
      })}
    />
  ) : (
    <DownOutlined />
  );

  return (
    <div data-testid={testId} className={cn(styles.transactionInOut, { [styles.separatorLine]: withSeparatorLine })}>
      <div className={styles.expanderHeader}>
        <div className={styles.title}>
          <Text.Body.Large weight="$bold">{title}</Text.Body.Large>
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
      {isVisible && children}
    </div>
  );
};
