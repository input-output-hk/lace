/* eslint-disable no-console */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { ErrorPane } from '@lace/common';
import { Wallet } from '@lace/cardano';

// import {
//   // DappInfo,
//   DappInfoProps
// } from '../DappInfo';

// import { DappTxHeader } from './DappTxHeader/DappTxHeader';
import { DappTxAsset, DappTxAssetProps } from './DappTxAsset/DappTxAsset';
import {
  // DappTxOutput,
  DappTxOutputProps
} from './DappTxOutput/DappTxOutput';
import styles from './DappTransaction.module.scss';
// import { useTranslate } from '@src/ui/hooks';
import { TransactionFee } from '@ui/components/ActivityDetail';
import { TransactionType, TransactionOrigin, DappTransactionSummary } from '@lace/ui';
import { TransactionSummaryInspection } from '@cardano-sdk/core';

export enum TxType {
  Send = 'Send',
  Mint = 'Mint',
  Burn = 'Burn',
  DRepRegistration = 'DRepRegistration',
  DRepRetirement = 'DRepRetirement',
  VoteDelegation = 'VoteDelegation',
  VotingProcedures = 'VotingProcedures'
}

type TransactionDetails = {
  fee: string;
  outputs: DappTxOutputProps[];
  type: TxType;
  mintedAssets?: DappTxAssetProps[];
  burnedAssets?: DappTxAssetProps[];
};

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: TransactionDetails;
  newTxSummary?: TransactionSummaryInspection;
  /** dApp information such as logo, name and url */
  // dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  fiatCurrencyCode?: string;
  fiatCurrencyPrice?: number;
  coinSymbol?: string;
}

export const DappTransaction = ({
  transaction: { type, fee, mintedAssets, burnedAssets },
  newTxSummary: { assets, coins, collateral, deposit, returnedDeposit, fee: sumFee, unresolved },
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol
}: DappTransactionProps): React.ReactElement => {
  // const { t } = useTranslate();
  console.log('dapp transaction', assets, coins, sumFee, collateral, deposit, returnedDeposit, unresolved);
  const totalAmount = Wallet.util.lovelacesToAdaString(coins.toString());
  console.log('total amount:', totalAmount);

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        {type === TxType.Mint && mintedAssets?.length > 0 && (
          <>
            <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin="Wingriders" />
            {mintedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === TxType.Mint && burnedAssets?.length > 0 && (
          <>
            <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin="Wingriders" />
            {burnedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )}
        {type === TxType.Send && (
          <>
            <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin="Wingriders" />
            <DappTransactionSummary
              title="Transaction Summary"
              cardanoSymbol={coinSymbol}
              transactionAmount={totalAmount}
            />
          </>
        )}

        {/* Add new fee */}
        {fee && fee !== '-' && (
          <TransactionFee
            fee={fee}
            amountTransformer={(ada: string) =>
              `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
            }
            coinSymbol={coinSymbol}
          />
        )}
      </div>
    </div>
  );
};
