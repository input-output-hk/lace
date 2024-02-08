/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable no-console */
/* eslint-disable sonarjs/no-duplicate-string */
import React from 'react';
import { ErrorPane } from '@lace/common';
import { Wallet } from '@lace/cardano';
import { Cardano, TransactionSummaryInspection, TokenTransferValue, AssetInfoWithAmount } from '@cardano-sdk/core';

import {
  // DappInfo,
  DappInfoProps
} from '../DappInfo';

// import { DappTxHeader } from './DappTxHeader/DappTxHeader';
import {
  // DappTxAsset,
  DappTxAssetProps
} from './DappTxAsset/DappTxAsset';
import {
  // DappTxOutput,
  DappTxOutputProps
} from './DappTxOutput/DappTxOutput';
import styles from './DappTransaction.module.scss';
// import { useTranslate } from '@src/ui/hooks';
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
  fee: string;
  outputs: DappTxOutputProps[];
  type: 'Mint' | 'Send';
  mintedAssets?: DappTxAssetProps[];
  burnedAssets?: DappTxAssetProps[];
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

export const DappTransaction = ({
  transaction: {
    type
    // mintedAssets, burnedAssets
  },
  newTxSummary: { assets, coins, fee },
  toAddress,
  fromAddress,
  errorMessage,
  fiatCurrencyCode,
  fiatCurrencyPrice,
  coinSymbol,
  dappInfo
}: DappTransactionProps): React.ReactElement => {
  // const { t } = useTranslate();
  console.log('dapp transaction 2', assets, toAddress, fromAddress);

  const totalAmount = Wallet.util.lovelacesToAdaString(coins.toString());
  const txFee = Wallet.util.lovelacesToAdaString(fee.toString());

  const groupedToAddresses = groupAddresses(toAddress);
  const groupedFromAddresses = groupAddresses(fromAddress);

  // So there shouldnt be a need here for mint/burn inspection, we can know what each addres is getting and losing by just checking at the inputs and outputs
  // if a token is minted for example, it will be listed in the toAddress of one of the address as it is required to be placed somewhere
  // if a token is burn, then we will see it in the fromAddress of some address (but no destination as there is none)

  return (
    <div>
      {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
      <div data-testid="dapp-transaction-container" className={styles.details}>
        {/* {type === TxType.Mint && mintedAssets?.length > 0 && (
          <> */}
        {/* <DappTxHeader
              title={t('package.core.dappTransaction.transaction')}
              subtitle={t('package.core.dappTransaction.mint')}
            /> */}
        {/* <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin={dappInfo.name} />
            {mintedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )} */}
        {/* {type === TxType.Mint && burnedAssets?.length > 0 && (
          <> */}
        {/* <DappTxHeader
              title={mintedAssets?.length > 0 ? undefined : t('package.core.dappTransaction.transaction')}
              subtitle={t('package.core.dappTransaction.burn')}
            /> */}
        {/* <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin={dappInfo.name} />
            {burnedAssets.map((asset) => (
              <DappTxAsset key={asset.name} {...asset} />
            ))}
          </>
        )} */}
        {type === TxType.Send && (
          <>
            <TransactionType label="Transaction" transactionType={type} data-testid="transaction-type-container" />
            <TransactionOrigin label="Origin" origin={dappInfo.name} />
            <DappTransactionSummary
              title="Transaction Summary"
              cardanoSymbol={coinSymbol}
              transactionAmount={totalAmount}
            />
            {[...assets].map(([key, assetWithAmmount]: [string, AssetInfoWithAmount]) => (
              <TransactionAssets
                key={key}
                imageSrc={assetWithAmmount.assetInfo.tokenMetadata.icon}
                balance={Wallet.util.lovelacesToAdaString(assetWithAmmount.amount.toString())}
                tokenName={assetWithAmmount.assetInfo.name}
                metadataHash={assetWithAmmount.assetInfo.nftMetadata?.name}
              />
            ))}

            <SummaryExpander title="To address">
              {groupedToAddresses.tokens.map((token) => (
                <TransactionAssets
                  key={token.assetInfo.fingerprint}
                  imageSrc={token.assetInfo.tokenMetadata.icon}
                  balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                  tokenName={token.assetInfo.name}
                />
              ))}
              {groupedToAddresses.nfts.map((token) => (
                <TransactionAssets
                  key={token.assetInfo.fingerprint}
                  imageSrc={token.assetInfo.tokenMetadata.icon}
                  balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                  tokenName={token.assetInfo.name}
                  metadataHash={token.assetInfo.nftMetadata?.name}
                />
              ))}
            </SummaryExpander>

            <SummaryExpander title="From address">
              {groupedFromAddresses.tokens.map((token) => (
                <TransactionAssets
                  key={token.assetInfo.fingerprint}
                  imageSrc={token.assetInfo.tokenMetadata.icon}
                  balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                  tokenName={token.assetInfo.name}
                  metadataHash={token.assetInfo.nftMetadata?.name}
                />
              ))}
              {groupedFromAddresses.nfts.map((token) => (
                <TransactionAssets
                  key={token.assetInfo.fingerprint}
                  imageSrc={token.assetInfo.tokenMetadata.icon}
                  balance={Wallet.util.lovelacesToAdaString(token.amount.toString())}
                  tokenName={token.assetInfo.name}
                  metadataHash={token.assetInfo.nftMetadata?.name}
                />
              ))}
            </SummaryExpander>
          </>
        )}

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
      </div>
    </div>
  );
};
