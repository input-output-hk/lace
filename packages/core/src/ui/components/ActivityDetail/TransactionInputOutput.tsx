/* eslint-disable no-magic-numbers */
import React, { useState } from 'react';
import { Tooltip } from 'antd';
import cn from 'classnames';

import { InfoCircleOutlined, DownOutlined } from '@ant-design/icons';
import { addEllipsis, Button } from '@lace/common';

import { TxOutputInput } from './TransactionDetailAsset';
import { TranslationsFor } from '../../utils/types';

import { ReactComponent as BracketDown } from '../../assets/icons/bracket-down.component.svg';
import styles from './TransactionInputOutput.module.scss';
import { Flex } from '@lace/ui';
import { getAddressTagTranslations, renderAddressTag } from '@ui/utils';
import { useTranslate } from '@ui/hooks';

const rotateOpen: React.CSSProperties = {
  transform: 'rotate(180deg)',
  transition: 'transform .2s linear'
};

const rotateClose: React.CSSProperties = {
  transform: 'rotate(0deg)',
  transition: 'transform .2s linear'
};

export interface TransactionInputOutputProps {
  testId?: string;
  title: string;
  list: TxOutputInput[];
  amountTransformer: (amun: string) => string;
  tooltipContent?: React.ReactNode;
  translations: TranslationsFor<'address' | 'sent'>;
  coinSymbol: string;
  withSeparatorLine?: boolean;
  ownAddresses: string[];
  addressToNameMap: Map<string, string>;
  sendAnalytics?: () => void;
}

export const TransactionInputOutput = ({
  testId = 'tx-input-output',
  title,
  list,
  amountTransformer,
  tooltipContent,
  translations,
  coinSymbol,
  withSeparatorLine,
  ownAddresses,
  addressToNameMap,
  sendAnalytics
}: TransactionInputOutputProps): React.ReactElement => {
  const [isVisible, setIsVisible] = useState<boolean>();
  const { t } = useTranslate();

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
          onClick={() => {
            !isVisible && sendAnalytics && sendAnalytics();
            setIsVisible((visible) => !visible);
          }}
          data-testid={'tx-addr-list_toggle'}
          icon={Icon}
          className={styles.arrowBtn}
        />
      </div>
      {isVisible && (
        <div className={styles.txInOutContent} data-testid="tx-addr-list">
          {list.map(({ addr: inputAddress, amount: addressAmount, assetList }, idx) => (
            <div className={styles.addressContainer} key={`${inputAddress}-${idx}`}>
              <div className={styles.row}>
                <div className={styles.label}>{translations.address}</div>
                <Flex flexDirection="column" alignItems="flex-end" gap="$8">
                  <div data-testid="tx-address" className={cn(styles.addressDetail, styles.content)}>
                    <Tooltip title={inputAddress}>{addEllipsis(inputAddress, 8, 8)}</Tooltip>
                  </div>
                  {renderAddressTag(inputAddress, getAddressTagTranslations(t), ownAddresses, addressToNameMap)}
                </Flex>
              </div>

              <div className={styles.row}>
                <div className={styles.label}>{translations.sent}</div>

                <div className={styles.content}>
                  <div data-testid="tx-amounts" className={styles.amount}>
                    {/* asset amount */}
                    <span data-testid="tx-ada-amount" className={styles.asset}>{`${addressAmount} ${coinSymbol}`}</span>
                    {/* fiat value */}
                    <span data-testid="tx-fiat-amount" className={styles.fiat}>
                      {amountTransformer(addressAmount)}
                    </span>
                  </div>
                  {assetList?.map(({ id: assetId, amount: assetAmount, name: assetName, fiatBalance }, indx) => (
                    <div data-testid="tx-asset" key={assetId || indx} className={styles.amount}>
                      <span className={styles.asset}> {`${assetAmount} ${assetName || assetId}`}</span>
                      {/* fiat value */}
                      <span className={styles.fiat}>{fiatBalance}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
