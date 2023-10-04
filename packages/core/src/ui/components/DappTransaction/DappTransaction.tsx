/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { ErrorPane } from '@lace/common';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { DappTxHeader } from './DappTxHeader/DappTxHeader';
import { DappTxAsset, DappTxAssetProps } from './DappTxAsset/DappTxAsset';
import { DappTxOutput, DappTxOutputProps } from './DappTxOutput/DappTxOutput';
import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';

type TransactionDetails = {
  fee: string;
  outputs: DappTxOutputProps[];
  type: 'Send' | 'Mint';
  mintedAssets?: DappTxAssetProps[];
  burnedAssets?: DappTxAssetProps[];
};

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: TransactionDetails;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
}

export const DappTransaction = ({
  transaction: { type, outputs, fee, mintedAssets, burnedAssets },
  dappInfo,
  errorMessage
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div>
      <DappInfo {...dappInfo} className={styles.dappInfo} />
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        {type === 'Mint' && mintedAssets?.length > 0 && (
          <>
            <DappTxHeader
              title={t('package.core.dappTransaction.transaction')}
              subtitle={t('package.core.dappTransaction.mint')}
            />
            {mintedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === 'Mint' && burnedAssets?.length > 0 && (
          <>
            <DappTxHeader
              title={mintedAssets?.length > 0 ? undefined : t('package.core.dappTransaction.transaction')}
              subtitle={t('package.core.dappTransaction.burn')}
            />
            {burnedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === 'Send' && (
          <>
            <DappTxHeader
              title={t('package.core.dappTransaction.transaction')}
              subtitle={t('package.core.dappTransaction.send')}
            />
            {outputs.map((output) => (
              <DappTxOutput key={output.recipient} {...output} />
            ))}
          </>
        )}
        {Number(fee) > 0 && (
          <div className={styles.feeContainer}>
            <div>{t('package.core.dappTransaction.fee')}:</div>
            <div>{fee.toString()} ADA</div>
          </div>
        )}
      </div>
    </div>
  );
};
