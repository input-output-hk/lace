/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { ErrorPane } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { DappInfo, DappInfoProps } from '../DappInfo';
import { DappTxHeader } from './DappTxHeader/DappTxHeader';
import { DappTxAsset } from './DappTxAsset/DappTxAsset';
import { DappTxOutput } from './DappTxOutput/DappTxOutput';
import styles from './DappTransaction.module.scss';
import { useTranslate } from '@src/ui/hooks';
import { TransactionFee, Collateral } from '@ui/components/ActivityDetail';

const amountTransformer = (fiat: { price: number; code: string }) => (ada: string) =>
  `${Wallet.util.convertAdaToFiat({ ada, fiat: fiat.price })} ${fiat.code}`;

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: Wallet.Cip30SignTxSummary;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  fiatCurrencyCode?: string;
  fiatCurrencyPrice?: number;
  coinSymbol?: string;
}

export const DappTransaction = ({
  transaction: { type, outputs, fee, mintedAssets, burnedAssets, collateral },
  dappInfo,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol
}: DappTransactionProps): React.ReactElement => {
  const { t } = useTranslate();
  return (
    <div>
      <DappInfo {...dappInfo} className={styles.dappInfo} />
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        {type === Wallet.Cip30TxType.Mint && mintedAssets?.length > 0 && (
          <>
            <DappTxHeader title={t('core.dappTransaction.transaction')} subtitle={t('core.dappTransaction.mint')} />
            {mintedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === Wallet.Cip30TxType.Mint && burnedAssets?.length > 0 && (
          <>
            <DappTxHeader
              title={burnedAssets?.length > 0 ? undefined : t('core.dappTransaction.transaction')}
              subtitle={t('core.dappTransaction.burn')}
            />
            {burnedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === Wallet.Cip30TxType.Send && (
          <>
            <DappTxHeader title={t('core.dappTransaction.transaction')} subtitle={t('core.dappTransaction.send')} />
            {outputs.map((output) => (
              <DappTxOutput key={output.recipient} {...output} />
            ))}
          </>
        )}
        {collateral && (
          <Collateral
            collateral={collateral}
            amountTransformer={amountTransformer({
              price: fiatCurrencyPrice,
              code: fiatCurrencyCode
            })}
            coinSymbol={coinSymbol}
          />
        )}
        {fee && fee !== '-' && (
          <TransactionFee
            fee={fee}
            amountTransformer={amountTransformer({
              price: fiatCurrencyPrice,
              code: fiatCurrencyCode
            })}
            coinSymbol={coinSymbol}
          />
        )}
      </div>
    </div>
  );
};
