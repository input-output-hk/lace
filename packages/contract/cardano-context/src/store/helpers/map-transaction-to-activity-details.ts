import { Cardano } from '@cardano-sdk/core';
import { Err, Ok, type Result } from '@lace-sdk/util';
import isEmpty from 'lodash/isEmpty';
import { catchError, from, map, of, switchMap } from 'rxjs';

import { getTransactionData } from './get-transaction-summary-data';
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
      'certificates' | 'outputs' | 'proposalProcedures' | 'votingProcedures'
    >;
  };
  summary: Pick<
    TransactionSummaryInspection,
    'coins' | 'collateral' | 'deposit' | 'resolvedInputs' | 'returnedDeposit'
  >;
  metadata: MetadataInspection;
  assetsInfo: Map<Cardano.AssetId, TokenMetadata<CardanoTokenMetadata>>;
  accountAddresses: Cardano.PaymentAddress[];
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

/**
 * Builds the Cardano-specific transaction data
 */
const buildCardanoTransaction = ({
  txDetails: {
    auxiliaryData,
    body: { outputs, votingProcedures, proposalProcedures, certificates },
  },
  summary: { coins, resolvedInputs, collateral, deposit, returnedDeposit },
  assetsInfo,
  accountAddresses,
}: BuildCardanoTransactionParams): CardanoTransaction => {
  const addrInputs = resolvedInputs.map(input =>
    inputOutputTransformer(input, assetsInfo),
  );
  const addrOutputs = outputs.map(output =>
    inputOutputTransformer(output, assetsInfo),
  );

  let txSummary: TxSummary[] | undefined;
  if (!hasRegOrDeregCertificate(certificates)) {
    // A transaction with registration or deregistration certificates is a self transaction,
    // meaning that all inputs and outputs belong to the wallet.
    // Transaction summary is needed only if this is an incoming or outgoing transaction, to
    // display the outputs coming into the wallet or inputs going out of the wallet respectively.
    txSummary = getTransactionData({
      addrOutputs,
      addrInputs,
      accountAddresses,
      isIncomingTransaction: coins > 0,
    });
  }

  return {
    deposit,
    returnedDeposit,
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

/**
 * Maps a transaction to detailed activity information for Cardano transactions.
 *
 * This function takes a basic activity and enriches it with detailed Cardano-specific
 * transaction information including inputs, outputs, metadata, certificates, and other
 * blockchain-specific details.
 *
 * @param {Object} params - Parameters required to map transaction to activity details.
 * @param {Activity} params.activity - The base activity to enrich with transaction details.
 * @param {ExtendedTxDetails} params.txDetails - Complete transaction details including body, metadata, and timing.
 * @param {Cardano.PaymentAddress[]} params.accountAddresses - Account addresses to track for input/output analysis.
 * @param {Cardano.RewardAccount} params.rewardAccount - The reward account associated with the activity.
 * @param {RequiredProtocolParameters} params.protocolParameters - Current protocol parameters for transaction validation.
 * @param {Cardano.InputResolver} params.inputResolver - Function to resolve transaction inputs with detailed information.
 * @param {Function} params.getTokenMetadata - Function to fetch token metadata for assets in the transaction.
 * @param {Logger} params.logger - Logger instance for error handling and debugging.
 * @returns {Observable<Result<ActivityDetail<CardanoTransaction>, Error>>} An observable that emits the enriched activity details.
 *
 * The function performs the following steps:
 * 1. Inspects the transaction using a transaction inspector to extract summary and metadata
 * 2. Fetches asset metadata for all tokens involved in the transaction
 * 3. Builds a detailed CardanoTransaction object with inputs, outputs, certificates, and metadata
 * 4. Returns an ActivityDetail object containing the original activity plus fee and blockchain-specific details
 *
 * Errors encountered during processing are captured as `Err` in the result.
 */
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
    switchMap(({ summary, metadata }) =>
      fetchAssetsMetadata(summary, getTokenMetadata).pipe(
        map(assetsInfo => ({ summary, metadata, assetsInfo })),
      ),
    ),
    map(({ summary, metadata, assetsInfo }) => ({
      fee: summary.fee.toString(),
      cardano: buildCardanoTransaction({
        txDetails,
        logger,
        summary,
        metadata,
        assetsInfo,
        accountAddresses,
      }),
    })),
    map(({ fee, cardano }) => {
      return Ok<ActivityDetail<CardanoTransaction>>({
        ...activity,
        fee,
        address: 'TODO',
        blockchainSpecific: cardano,
      });
    }),
    catchError((error: Error) => {
      return of(Err(error));
    }),
  );
};
