import { Cardano } from '@cardano-sdk/core';
import { ActivityType } from '@lace-contract/activities';
import { Err, Ok, type Result } from '@lace-lib/util';
import isEmpty from 'lodash/isEmpty';
import { catchError, from, map, of, switchMap } from 'rxjs';

import {
  computeNetFlows,
  type TokenTransferValue,
} from '../../compute-net-flows';

import { inputOutputTransformer } from './input-output-transform';
import {
  createTransactionInspector,
  fetchAssetsMetadata,
} from './transaction-inspectors';

import type {
  CardanoRewardAccount,
  CardanoTokenMetadata,
  CardanoTransaction,
  ExtendedTxDetails,
  RequiredProtocolParameters,
  TxSummary,
  TxMetadata,
} from '../../types';
import type { TokenTransferValue as SdkTokenTransferValue } from '@cardano-sdk/core';
import type {
  MetadataInspection,
  TransactionSummaryInspection,
} from '@cardano-sdk/core';
import type { Activity, ActivityDetail } from '@lace-contract/activities';
import type { TokenId, TokenMetadata } from '@lace-contract/tokens';
import type { Observable } from 'rxjs';
import type { Logger } from 'ts-log';

export type MapActivityToActivityDetailsParams = {
  activity: Activity;
  txDetails: ExtendedTxDetails;
  accountAddresses: Cardano.PaymentAddress[];
  rewardAccount: CardanoRewardAccount;
  protocolParameters: RequiredProtocolParameters;
  inputResolver: Cardano.InputResolver;
  getTokenMetadata: (
    tokenId: TokenId,
  ) => Observable<Result<TokenMetadata<CardanoTokenMetadata>, Error>>;
  logger: Logger;
};

export type BuildCardanoTransactionParams = {
  logger: Logger;
  txDetails: Pick<ExtendedTxDetails, 'auxiliaryData' | 'body'> & {
    body: Pick<
      Cardano.HydratedTxBody,
      | 'certificates'
      | 'donation'
      | 'outputs'
      | 'proposalProcedures'
      | 'votingProcedures'
    >;
  };
  summary: Pick<
    TransactionSummaryInspection,
    'coins' | 'collateral' | 'deposit' | 'resolvedInputs' | 'returnedDeposit'
  >;
  metadata: MetadataInspection;
  assetsInfo: Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>;
  accountAddresses: Cardano.PaymentAddress[];
  tokenTransfer: {
    fromAddress: Map<Cardano.PaymentAddress, SdkTokenTransferValue>;
    toAddress: Map<Cardano.PaymentAddress, SdkTokenTransferValue>;
  };
};

export const cardanoMetadatumToObject = (
  metadatum: Cardano.Metadatum,
): unknown[] | string => {
  if (typeof metadatum === 'string') {
    return metadatum;
  }

  if (typeof metadatum === 'bigint') {
    return metadatum.toString();
  }

  if (metadatum instanceof Map) {
    // Properly convert both key and value, since key can be a Metadatum as well
    return [...metadatum.entries()].map(([key, value]) => ({
      [typeof key === 'object' ? `[${key.constructor.name}]` : key.toString()]:
        cardanoMetadatumToObject(value),
    }));
  }

  if (Array.isArray(metadatum)) {
    return metadatum.map(item => cardanoMetadatumToObject(item));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(metadatum);
  } catch {
    // If UTF-8 decoding fails, return a fallback representation
    return `[Invalid UTF-8: ${metadatum.length} bytes]`;
  }
};

export const transactionMetadataTransformer = (
  metadata: Cardano.TxMetadata,
): TxMetadata[] =>
  [...metadata.entries()].map(([key, value]) => ({
    key: key.toString(),
    value: cardanoMetadatumToObject(value),
  }));

const hasRegOrDeregCertificate = (
  certificates: Cardano.HydratedCertificate[] | undefined,
): boolean =>
  !!certificates?.some(cert =>
    Cardano.isCertType(cert, Cardano.RegAndDeregCertificateTypes),
  );

const MAX_SUMMARY_ADDRESSES = 5;

const buildTxSummaryFromNetFlows = (
  netFlows: {
    from: Map<Cardano.PaymentAddress, TokenTransferValue>;
    to: Map<Cardano.PaymentAddress, TokenTransferValue>;
  },
  accountAddresses: Cardano.PaymentAddress[],
  isIncoming: boolean,
): TxSummary[] | undefined => {
  const ownSet = new Set(accountAddresses);
  if (isIncoming) {
    const senderAddrs = [...netFlows.from.keys()]
      .filter(addr => !ownSet.has(addr))
      .slice(0, MAX_SUMMARY_ADDRESSES);
    if (senderAddrs.length > 0) {
      const walletEntry = [...netFlows.to.entries()].find(([addr]) =>
        ownSet.has(addr),
      );
      // Returns undefined rather than emit a TxSummary with the wrong amount when inspectors disagree on sign.
      if (!walletEntry) return undefined;
      return [
        {
          addr: senderAddrs,
          amount: walletEntry[1].coins,
          type: ActivityType.Receive,
        },
      ];
    }
  }
  const foreignRecipients = [...netFlows.to.entries()].filter(
    ([addr]) => !ownSet.has(addr),
  );
  if (foreignRecipients.length === 0) return undefined;
  return foreignRecipients
    .slice(0, MAX_SUMMARY_ADDRESSES)
    .map(([addr, value]) => ({
      addr: [addr],
      amount: value.coins,
      type: ActivityType.Send,
    }));
};

const buildCardanoTransaction = ({
  txDetails: {
    auxiliaryData,
    body: {
      outputs,
      votingProcedures,
      proposalProcedures,
      certificates,
      donation,
    },
  },
  summary: { coins, resolvedInputs, collateral, deposit, returnedDeposit },
  assetsInfo,
  accountAddresses,
  tokenTransfer,
}: BuildCardanoTransactionParams): CardanoTransaction => {
  const addrInputs = resolvedInputs.map(input =>
    inputOutputTransformer(input, assetsInfo),
  );
  const addrOutputs = outputs.map(output =>
    inputOutputTransformer(output, assetsInfo),
  );

  let txSummary: TxSummary[] | undefined;
  if (!hasRegOrDeregCertificate(certificates)) {
    const netFlows = computeNetFlows(
      tokenTransfer.fromAddress,
      tokenTransfer.toAddress,
      accountAddresses,
    );
    txSummary = buildTxSummaryFromNetFlows(
      netFlows,
      accountAddresses,
      coins > 0n,
    );
  }

  return {
    deposit,
    returnedDeposit,
    donation,
    addrInputs,
    addrOutputs,
    metadata:
      auxiliaryData?.blob && !isEmpty(auxiliaryData.blob)
        ? transactionMetadataTransformer(auxiliaryData.blob)
        : undefined,
    collateral,
    votingProcedures,
    proposalProcedures,
    certificates,
    txSummary,
    // TODO: LW-13466 add pools in case of delegation transaction. Requires stakePoolProvider
  };
};

export const mapTransactionToActivityDetails = ({
  activity,
  txDetails,
  accountAddresses,
  rewardAccount,
  protocolParameters,
  inputResolver,
  getTokenMetadata,
  logger,
}: MapActivityToActivityDetailsParams): Observable<
  Result<ActivityDetail<CardanoTransaction>, Error>
> => {
  const txSummaryInspector = createTransactionInspector({
    accountAddresses,
    rewardAccount,
    protocolParameters,
    inputResolver,
    logger,
  });

  return from(txSummaryInspector(txDetails)).pipe(
    switchMap(({ summary, metadata, tokenTransfer }) =>
      fetchAssetsMetadata(summary, getTokenMetadata).pipe(
        map(assetsInfo => ({ summary, metadata, tokenTransfer, assetsInfo })),
      ),
    ),
    map(({ summary, metadata, tokenTransfer, assetsInfo }) => ({
      fee: summary.fee.toString(),
      cardano: buildCardanoTransaction({
        txDetails,
        logger,
        summary,
        metadata,
        assetsInfo,
        accountAddresses,
        tokenTransfer,
      }),
    })),
    map(({ fee, cardano }) => {
      return Ok<ActivityDetail<CardanoTransaction>>({
        ...activity,
        fee,
        address: cardano.txSummary?.[0]?.addr[0] ?? '',
        blockchainSpecific: cardano,
      });
    }),
    catchError((error: Error) => {
      return of(Err(error));
    }),
  );
};
