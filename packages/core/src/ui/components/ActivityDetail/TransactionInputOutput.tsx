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
import { Box, Flex, Text } from '@lace/ui';
import { getAddressTagTranslations, renderAddressTag } from '@ui/utils';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const animation = isVisible ? rotateOpen : rotateClose;
  const Icon = BracketDown ? <BracketDown className={styles.bracket} style={{ ...animation }} /> : <DownOutlined />;

  return (
    <div data-testid={testId} className={cn(styles.transactionInOut, { [styles.separatorLine]: withSeparatorLine })}>
      <div className={styles.expanderHeader}>
        <div>
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
          {list.map(({ addr: inputAddress, amount: addressAmount, assetList }, idx) => {
            const addressName = addressToNameMap?.get(inputAddress);
            return (
              <div className={styles.addressContainer} key={`${inputAddress}-${idx}`}>
                <div className={styles.row}>
                  <Text.Body.Normal weight="$semibold" className={styles.label}>
                    {translations.address}
                  </Text.Body.Normal>
                  <Flex flexDirection="column" alignItems="flex-end">
                    {addressName && (
                      <Box mb="$4" className={cn([styles.rightAlign, styles.addressTextContainer])}>
                        <Text.Address>{addressToNameMap?.get(inputAddress)}</Text.Address>
                      </Box>
                    )}
                    <Box
                      mb={addressName ? '$4' : '$12'}
                      data-testid="tx-address"
                      className={cn([styles.rightAlign, styles.addressTextContainer])}
                    >
                      <Tooltip title={inputAddress}>
                        <Text.Address color={addressName ? 'secondary' : 'primary'} weight="$medium">
                          {addEllipsis(inputAddress, 8, 8)}
                        </Text.Address>
                      </Tooltip>
                    </Box>
                    {renderAddressTag({
                      address: inputAddress,
                      translations: getAddressTagTranslations(t),
                      ownAddresses
                    })}
                  </Flex>
                </div>

                <div className={styles.row}>
                  <Text.Body.Normal weight="$semibold" className={styles.label}>
                    {translations.sent}
                  </Text.Body.Normal>

                  <div className={styles.content}>
                    <div data-testid="tx-amounts" className={styles.amount}>
                      {/* asset amount */}
                      <Text.Body.Normal data-testid="tx-ada-amount" weight="$medium">
                        {`${addressAmount} ${coinSymbol}`}
                      </Text.Body.Normal>
                      {/* fiat value */}
                      <Text.Body.Normal data-testid="tx-fiat-amount" color="secondary" weight="$medium">
                        {amountTransformer(addressAmount)}
                      </Text.Body.Normal>
                    </div>
                    {assetList?.map(({ id: assetId, amount: assetAmount, name: assetName, fiatBalance }, indx) => (
                      <div data-testid="tx-asset" key={assetId || indx} className={styles.amount}>
                        <Text.Body.Normal weight="$medium">{`${assetAmount} ${assetName || assetId}`}</Text.Body.Normal>
                        <Text.Body.Normal color="secondary" weight="$medium">
                          {fiatBalance}
                        </Text.Body.Normal>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
