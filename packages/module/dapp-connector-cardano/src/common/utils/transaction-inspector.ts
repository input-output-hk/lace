import {
  Serialization,
  assetsBurnedInspector,
  assetsMintedInspector,
  createTxInspector,
  delegationInspector,
  metadataInspector,
  poolRegistrationInspector,
  poolRetirementInspector,
  stakeKeyDeregistrationInspector,
  stakeKeyRegistrationInspector,
  withdrawalInspector,
} from '@cardano-sdk/core';

import type { Cardano } from '@cardano-sdk/core';

/**
 * Certificate information extracted from transaction.
 */
export interface CertificateInfo {
  /** Certificate type */
  type: string;
  /** Deposit amount if applicable */
  deposit?: bigint;
  /** DRep ID if applicable */
  dRepId?: string;
  /** Pool ID if applicable */
  poolId?: string;
  /** Stake key hash/address if applicable */
  stakeKeyHash?: string;
  /** Anchor URL if applicable */
  anchorUrl?: string;
  /** Anchor data hash if applicable */
  anchorHash?: string;
}

/**
 * Collateral input reference.
 */
export interface CollateralInput {
  /** Transaction ID */
  txId: string;
  /** Output index */
  index: number;
}

/**
 * Minted or burned asset surfaced by the SDK mint inspectors.
 *
 * Mirrors `@cardano-sdk/core`'s `MintedAsset` shape without leaking the
 * `Script` type into our barrel so consumers can stay decoupled.
 */
export interface InspectedMintedAsset {
  policyId: Cardano.PolicyId;
  assetName: Cardano.AssetName;
  fingerprint: Cardano.AssetFingerprint;
  quantity: bigint;
  script?: Cardano.Script;
}

/**
 * Basic transaction information extracted from CBOR.
 * This provides raw transaction data without input resolution.
 */
export interface TransactionInfo {
  /** Number of transaction inputs */
  inputsCount: number;
  /** Number of transaction outputs */
  outputsCount: number;
  /** Transaction fee in lovelace */
  fee: bigint;
  /** Transaction validity interval start (slot number) */
  validityIntervalStart?: Cardano.Slot;
  /** Transaction time-to-live (slot number) */
  ttl?: Cardano.Slot;
  /** Whether the transaction has collateral inputs */
  hasCollateral: boolean;
  /** Number of collateral inputs */
  collateralInputsCount: number;
  /** Collateral input references */
  collateralInputs: CollateralInput[];
  /** Whether the transaction includes metadata */
  hasMetadata: boolean;
  /** Whether the transaction has minting/burning */
  hasMint: boolean;
  /** Whether the transaction has certificates */
  hasCertificates: boolean;
  /** Number of certificates */
  certificatesCount: number;
  /** Certificate details (simplified) */
  certificates: CertificateInfo[];
  /** Raw Cardano certificates for detailed rendering */
  rawCertificates: Cardano.Certificate[];
  /** Whether the transaction has withdrawals */
  hasWithdrawals: boolean;
  /** Raw outputs with addresses and values */
  outputs: Array<{
    address: string;
    value: bigint;
    assets: Array<{ policyId: string; assetName: string; quantity: bigint }>;
  }>;
  /** Total deposit paid for registrations (stake key, DRep, etc.) in lovelace */
  deposit: bigint;
  /** Total deposit returned from deregistrations in lovelace */
  returnedDeposit: bigint;
  /** Whether the transaction has proposal procedures */
  hasProposalProcedures: boolean;
  /** Number of proposal procedures */
  proposalProceduresCount: number;
  /** Raw Cardano proposal procedures for detailed rendering */
  proposalProcedures: Cardano.ProposalProcedure[];
  /** Whether the transaction has voting procedures */
  hasVotingProcedures: boolean;
  /** Number of voting procedures */
  votingProceduresCount: number;
  /** Raw Cardano voting procedures for detailed rendering */
  votingProcedures: Cardano.VotingProcedures;
  /** Whether the transaction has auxiliary data (metadata) */
  hasAuxiliaryData: boolean;
  /** Raw Cardano auxiliary data for detailed rendering */
  auxiliaryData?: Cardano.AuxiliaryData;
  /** Assets minted in this transaction (positive quantity), per SDK inspector */
  mintedAssets?: InspectedMintedAsset[];
  /** Assets burned in this transaction (negative quantity made positive), per SDK inspector */
  burnedAssets?: InspectedMintedAsset[];
  /** Total lovelace being withdrawn from reward accounts */
  withdrawalTotal?: bigint;
  /** Transaction metadatum map from auxiliary data, if any */
  metadata?: Cardano.Metadatum;
  /** Stake delegation certificates */
  delegationCertificates?: Cardano.StakeDelegationCertificate[];
  /** Stake key registration certificates */
  stakeKeyRegistrations?: Cardano.StakeAddressCertificate[];
  /** Stake key deregistration certificates */
  stakeKeyDeregistrations?: Cardano.StakeAddressCertificate[];
  /** Stake pool registration certificates */
  poolRegistrations?: Cardano.PoolRegistrationCertificate[];
  /** Stake pool retirement certificates */
  poolRetirements?: Cardano.PoolRetirementCertificate[];
}

/**
 * Result of transaction inspection.
 */
export interface TransactionInspectorResult {
  /** Parsed transaction information, null if parsing failed */
  transactionInfo: TransactionInfo | null;
  /** Error message if parsing failed */
  error: string | null;
  /** Whether the transaction is currently being parsed */
  isLoading: boolean;
}

/**
 * Certificate types that require a deposit to be paid (registrations).
 */
const DEPOSIT_CERTIFICATE_TYPES = new Set([
  'Registration',
  'StakeRegistration',
  'RegisterDelegateRepresentative',
  'StakeRegistrationDelegation',
  'VoteRegistrationDelegation',
  'StakeVoteRegistrationDelegation',
]);

/**
 * Certificate types that return a deposit (deregistrations).
 */
const RETURNED_DEPOSIT_CERTIFICATE_TYPES = new Set([
  'Unregistration',
  'StakeDeregistration',
  'UnregisterDelegateRepresentative',
]);

const isDepositCertificate = (certType: string): boolean =>
  DEPOSIT_CERTIFICATE_TYPES.has(certType);

const isReturnedDepositCertificate = (certType: string): boolean =>
  RETURNED_DEPOSIT_CERTIFICATE_TYPES.has(certType);

const extractCertificateInfo = (cert: Cardano.Certificate): CertificateInfo => {
  const info: CertificateInfo = {
    type: cert.__typename,
  };

  const certAny = cert as unknown as Record<string, unknown>;

  if ('deposit' in certAny && typeof certAny.deposit === 'bigint') {
    info.deposit = certAny.deposit;
  }

  if ('poolId' in certAny && typeof certAny.poolId === 'string') {
    info.poolId = certAny.poolId;
  }

  if ('dRepCredential' in certAny && certAny.dRepCredential) {
    const dRepCred = certAny.dRepCredential as { hash?: string };
    if (dRepCred.hash) {
      info.dRepId = dRepCred.hash;
    }
  }

  if ('anchor' in certAny && certAny.anchor) {
    const anchor = certAny.anchor as { url?: string; dataHash?: string };
    if (anchor.url) {
      info.anchorUrl = anchor.url;
    }
    if (anchor.dataHash) {
      info.anchorHash = anchor.dataHash;
    }
  }

  return info;
};

/**
 * Parses a Cardano transaction CBOR hex and extracts comprehensive information
 * using `@cardano-sdk/core` inspectors for structured fields (mint, burn,
 * withdrawal, metadata, typed certificate groupings).
 *
 * Pure with respect to wallet state — produces raw transaction data useful for
 * display without requiring address/UTXO context. Use `useDappTxInspection`
 * when address-resolved from/to maps and a rich summary are needed.
 *
 * @param txHex - Transaction CBOR hex string to parse
 * @returns Transaction inspection result containing parsed info or error
 */
export const inspectTransaction = async (
  txHex: string,
): Promise<TransactionInspectorResult> => {
  if (!txHex) {
    return {
      transactionInfo: null,
      error: 'No transaction data provided',
      isLoading: false,
    };
  }

  try {
    const tx = Serialization.Transaction.fromCbor(Serialization.TxCBOR(txHex));
    const coreTx = tx.toCore();
    const { body } = coreTx;

    const inspector = createTxInspector({
      delegationCertificates: delegationInspector,
      stakeKeyRegistrations: stakeKeyRegistrationInspector,
      stakeKeyDeregistrations: stakeKeyDeregistrationInspector,
      poolRegistrations: poolRegistrationInspector,
      poolRetirements: poolRetirementInspector,
      withdrawalTotal: withdrawalInspector,
      mintedAssets: assetsMintedInspector,
      burnedAssets: assetsBurnedInspector,
      metadata: metadataInspector,
    });
    const inspection = await inspector(coreTx);

    const outputs = body.outputs.map(output => {
      const assets: TransactionInfo['outputs'][0]['assets'] = [];

      if (output.value.assets) {
        for (const [assetId, quantity] of output.value.assets) {
          const policyId = assetId.slice(0, 56);
          const assetName = assetId.slice(56);
          assets.push({ policyId, assetName, quantity });
        }
      }

      return {
        address: output.address.toString(),
        value: output.value.coins,
        assets,
      };
    });

    const collateralInputs: CollateralInput[] = (body.collaterals ?? []).map(
      input => ({
        txId: input.txId,
        index: input.index,
      }),
    );

    const rawCertificates: Cardano.Certificate[] = body.certificates ?? [];

    const certificates: CertificateInfo[] = rawCertificates.map(cert =>
      extractCertificateInfo(cert),
    );

    let deposit = BigInt(0);
    let returnedDeposit = BigInt(0);

    for (const cert of certificates) {
      if (cert.deposit !== undefined) {
        if (isDepositCertificate(cert.type)) {
          deposit += cert.deposit;
        } else if (isReturnedDepositCertificate(cert.type)) {
          returnedDeposit += cert.deposit;
        }
      }
    }

    const proposalProcedures: Cardano.ProposalProcedure[] =
      body.proposalProcedures ?? [];

    const votingProcedures: Cardano.VotingProcedures =
      body.votingProcedures ?? [];

    const auxiliaryData = coreTx.auxiliaryData;

    const hasMint = body.mint !== undefined && body.mint.size > 0;
    const hasAuxiliaryData = auxiliaryData !== undefined;
    const hasAuxiliaryBlob =
      hasAuxiliaryData &&
      auxiliaryData?.blob !== undefined &&
      auxiliaryData.blob.size > 0;

    const transactionInfo: TransactionInfo = {
      inputsCount: body.inputs.length,
      outputsCount: body.outputs.length,
      fee: body.fee,
      validityIntervalStart: body.validityInterval?.invalidBefore,
      ttl: body.validityInterval?.invalidHereafter,
      hasCollateral: (body.collaterals?.length ?? 0) > 0,
      collateralInputsCount: body.collaterals?.length ?? 0,
      collateralInputs,
      hasMetadata: hasAuxiliaryData,
      hasMint,
      hasCertificates: rawCertificates.length > 0,
      certificatesCount: rawCertificates.length,
      certificates,
      rawCertificates,
      hasWithdrawals:
        body.withdrawals !== undefined && body.withdrawals.length > 0,
      outputs,
      deposit,
      returnedDeposit,
      hasProposalProcedures: proposalProcedures.length > 0,
      proposalProceduresCount: proposalProcedures.length,
      proposalProcedures,
      hasVotingProcedures: votingProcedures.length > 0,
      votingProceduresCount: votingProcedures.length,
      votingProcedures,
      hasAuxiliaryData,
      auxiliaryData,
      mintedAssets:
        inspection.mintedAssets.length > 0
          ? inspection.mintedAssets
          : undefined,
      burnedAssets:
        inspection.burnedAssets.length > 0
          ? inspection.burnedAssets
          : undefined,
      withdrawalTotal: inspection.withdrawalTotal,
      metadata: hasAuxiliaryBlob ? inspection.metadata : undefined,
      delegationCertificates:
        inspection.delegationCertificates.length > 0
          ? inspection.delegationCertificates
          : undefined,
      stakeKeyRegistrations:
        inspection.stakeKeyRegistrations.length > 0
          ? inspection.stakeKeyRegistrations
          : undefined,
      stakeKeyDeregistrations:
        inspection.stakeKeyDeregistrations.length > 0
          ? inspection.stakeKeyDeregistrations
          : undefined,
      poolRegistrations:
        inspection.poolRegistrations.length > 0
          ? inspection.poolRegistrations
          : undefined,
      poolRetirements:
        inspection.poolRetirements.length > 0
          ? inspection.poolRetirements
          : undefined,
    };

    return {
      transactionInfo,
      error: null,
      isLoading: false,
    };
  } catch (error) {
    return {
      transactionInfo: null,
      error:
        error instanceof Error ? error.message : 'Failed to parse transaction',
      isLoading: false,
    };
  }
};

/**
 * Formats lovelace value to ADA with appropriate decimal places.
 *
 * Converts from lovelace (smallest unit) to ADA, where 1 ADA = 1,000,000 lovelace.
 * Formats with locale-appropriate separators and 2-6 decimal places.
 *
 * @param lovelace - Value in lovelace (1 ADA = 1,000,000 lovelace)
 * @returns Formatted ADA string with appropriate decimal places
 */
export const formatLovelaceToAda = (lovelace: bigint): string => {
  const ada = Number(lovelace) / 1_000_000;
  return ada.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};
