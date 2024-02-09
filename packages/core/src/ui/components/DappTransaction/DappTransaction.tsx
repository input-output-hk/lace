/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-console */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { ErrorPane } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';
import { Typography } from 'antd';

import { DappInfoProps } from '../DappInfo';

import styles from './DappTransaction.module.scss';

import { TransactionFee } from '@ui/components/ActivityDetail';
import {
  TransactionType,
  TransactionOrigin,
  DappTransactionSummary,
  TransactionAssets,
  SummaryExpander
} from '@lace/ui';

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
  type: 'Mint' | 'Send';
};

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: TransactionDetails;
  newTxSummary?: TransactionSummaryInspection;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  fiatCurrencyCode?: string;
  fiatCurrencyPrice?: number;
  coinSymbol?: string;
  /** tokens send to being sent to or from the user */
  fromAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
  toAddress: Map<Cardano.PaymentAddress, TokenTransferValue>;
}

const { Title } = Typography;

const groupAddresses = (addresses: Map<Cardano.PaymentAddress, TokenTransferValue>) => {
  const groupedAddresses: { nfts: Array<AssetInfoWithAmount>; tokens: Array<AssetInfoWithAmount> } = {
    nfts: [],
    tokens: []
  };

  for (const [_, value] of addresses) {
    const addressAssets = value.assets;

    for (const [__, asset] of addressAssets) {
      if (asset.assetInfo.nftMetadata !== null) {
        groupedAddresses.nfts.push(asset);
      } else {
        groupedAddresses.tokens.push(asset);
      }
    }
  }

  return groupedAddresses;
};

const tokenName = (assetWithAmount: AssetInfoWithAmount) =>
  assetWithAmount.assetInfo.nftMetadata !== null
    ? assetWithAmount.assetInfo.nftMetadata.name
    : assetWithAmount.assetInfo.tokenMetadata.ticker;

export const DappTransaction = ({
  transaction: { type },
  newTxSummary: { assets, coins, fee },
  toAddress,
  fromAddress,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol,
  dappInfo
}: DappTransactionProps): React.ReactElement => {
  console.log('dapp transaction 2', assets, toAddress, fromAddress);

  const totalAmount = Wallet.util.lovelacesToAdaString(coins.toString());
  const txFee = Wallet.util.lovelacesToAdaString(fee.toString());

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  console.log('grouped addresses:', groupedToAddresses);
  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        {type === TxType.Send && (
          <>
            <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin={dappInfo.name} />
            <DappTransactionSummary
              title="Transaction Summary"
              cardanoSymbol={coinSymbol}
              transactionAmount={totalAmount}
            />
            {[...assets].map(([key, assetWithAmount]: [string, AssetInfoWithAmount]) => (
              <TransactionAssets
                key={key}
                imageSrc={assetWithAmount.assetInfo.tokenMetadata.icon}
                balance={Wallet.util.lovelacesToAdaString(assetWithAmount.amount.toString())}
                tokenName={tokenName(assetWithAmount)}
                metadataHash={assetWithAmount.assetInfo.nftMetadata?.name}
              />
            ))}

            {/* Display fee */}
            {txFee && txFee !== '-' && (
              <TransactionFee
                fee={txFee}
                amountTransformer={(ada: string) =>
                  `${Wallet.util.convertAdaToFiat({ ada, fiat: fiatCurrencyPrice })} ${fiatCurrencyCode}`
                }
                coinSymbol={coinSymbol}
              />
            )}

            <SummaryExpander title="To address">
              {groupedToAddresses.tokens.length > 0 && (
                <>
                  <Title level={5}>Tokens</Title>
                  {groupedToAddresses.tokens.map((token) => (
                    <TransactionAssets
                      key={token.assetInfo.fingerprint}
                      imageSrc={token.assetInfo.tokenMetadata.icon}
                      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                      tokenName={token.assetInfo.tokenMetadata.ticker}
                    />
                  ))}
                </>
              )}
              {groupedToAddresses.nfts.length > 0 && (
                <>
                  <Title level={5}>NFTs</Title>
                  {groupedToAddresses.nfts.map((token) => (
                    <TransactionAssets
                      key={token.assetInfo.fingerprint}
                      imageSrc={token.assetInfo.tokenMetadata.icon}
                      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                      tokenName={token.assetInfo.name}
                      metadataHash={token.assetInfo.nftMetadata?.name}
                    />
                  ))}
                </>
              )}
            </SummaryExpander>

            <SummaryExpander title="From address">
              {groupedFromAddresses.tokens.length > 0 && (
                <>
                  <Title level={5}>Tokens</Title>
                  {groupedFromAddresses.tokens.map((token) => (
                    <TransactionAssets
                      key={token.assetInfo.fingerprint}
                      imageSrc={token.assetInfo.tokenMetadata.icon}
                      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                      tokenName={token.assetInfo.tokenMetadata.ticker}
                      metadataHash={token.assetInfo.nftMetadata?.name}
                    />
                  ))}
                </>
              )}
              {groupedFromAddresses.nfts.length > 0 && (
                <>
                  <Title level={5}>NFTs</Title>
                  {groupedFromAddresses.nfts.map((token) => (
                    <TransactionAssets
                      key={token.assetInfo.fingerprint}
                      imageSrc={token.assetInfo.tokenMetadata.icon}
                      balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                      tokenName={token.assetInfo.name}
                      metadataHash={token.assetInfo.nftMetadata?.name}
                    />
                  ))}
                </>
              )}
            </SummaryExpander>
          </>
        )}
      </div>
    </div>
  );
};
