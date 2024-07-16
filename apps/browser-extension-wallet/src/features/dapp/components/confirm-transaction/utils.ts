/* eslint-disable sonarjs/no-small-switch */
/* eslint-disable complexity */
import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { RemoteApiPropertyType, TransactionWitnessRequest, WalletType, exposeApi } from '@cardano-sdk/web-extension';
import type { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS, cardanoCoin } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';

const { CertificateType } = Wallet.Cardano;

const DAPP_TOAST_DURATION = 50;

export const readyToSign = (): void => {
  exposeApi<Pick<UserPromptService, 'readyToSignTx'>>(
    {
      api$: of({
        async readyToSignTx(): Promise<boolean> {
          return Promise.resolve(true);
        }
      }),
      baseChannel: DAPP_CHANNELS.userPrompt,
      properties: { readyToSignTx: RemoteApiPropertyType.MethodReturningPromise }
    },
    { logger: console, runtime }
  );
};

export const disallowSignTx = async (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  close = false
): Promise<void> => {
  await req.reject('User declined to sign');
  close && setTimeout(() => window.close(), DAPP_TOAST_DURATION);
};

export const allowSignTx = async (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  callback?: () => void
): Promise<void> => {
  if (req.walletType !== WalletType.Ledger && req.walletType !== WalletType.Trezor) {
    throw new Error('Invalid state: expected hw wallet');
  }
  await req.sign();
  callback && callback();
};

export const certificateInspectorFactory =
  <T extends Wallet.Cardano.Certificate>(type: Wallet.Cardano.CertificateType) =>
  async (tx: Wallet.Cardano.Tx): Promise<T | undefined> =>
    tx?.body?.certificates?.find((certificate) => certificate.__typename === type) as T | undefined;

export const votingProceduresInspector = async (
  tx: Wallet.Cardano.Tx
): Promise<Wallet.Cardano.VotingProcedures | undefined> => tx?.body?.votingProcedures;

// eslint-disable-next-line complexity
export const proposalProceduresInspector = async (
  tx: Wallet.Cardano.Tx
): Promise<Wallet.Cardano.ProposalProcedure[] | undefined> => tx?.body?.proposalProcedures;

export const getTxType = async (tx: Wallet.Cardano.Tx): Promise<Wallet.Cip30TxType> => {
  const inspector = createTxInspector({
    minted: assetsMintedInspector,
    burned: assetsBurnedInspector,
    votingProcedures: votingProceduresInspector,
    proposalProcedures: proposalProceduresInspector,
    dRepRegistration: certificateInspectorFactory(CertificateType.RegisterDelegateRepresentative),
    dRepRetirement: certificateInspectorFactory(CertificateType.UnregisterDelegateRepresentative),
    dRepUpdate: certificateInspectorFactory(CertificateType.UpdateDelegateRepresentative),
    voteDelegation: certificateInspectorFactory(CertificateType.VoteDelegation),
    voteRegistrationDelegation: certificateInspectorFactory(CertificateType.VoteRegistrationDelegation),
    stakeVoteDelegation: certificateInspectorFactory(CertificateType.StakeVoteDelegation),
    stakeRegistrationDelegation: certificateInspectorFactory(CertificateType.StakeRegistrationDelegation),
    stakeVoteDelegationRegistration: certificateInspectorFactory(CertificateType.StakeVoteRegistrationDelegation)
  });

  const {
    minted,
    burned,
    votingProcedures,
    dRepRegistration,
    dRepRetirement,
    dRepUpdate,
    voteDelegation,
    stakeVoteDelegation,
    voteRegistrationDelegation,
    stakeRegistrationDelegation,
    stakeVoteDelegationRegistration,
    proposalProcedures
  } = await inspector(tx as Wallet.Cardano.HydratedTx);
  const isMintTransaction = minted.length > 0;
  const isBurnTransaction = burned.length > 0;

  if (proposalProcedures) {
    return Wallet.Cip30TxType.ProposalProcedures;
  }

  if (votingProcedures) {
    return Wallet.Cip30TxType.VotingProcedures;
  }

  if (isMintTransaction) {
    return Wallet.Cip30TxType.Mint;
  }

  if (isBurnTransaction) {
    return Wallet.Cip30TxType.Burn;
  }

  if (dRepRegistration) {
    return Wallet.Cip30TxType.DRepRegistration;
  }

  if (dRepRetirement) {
    return Wallet.Cip30TxType.DRepRetirement;
  }

  if (voteDelegation) {
    return Wallet.Cip30TxType.VoteDelegation;
  }

  if (stakeVoteDelegation) {
    return Wallet.Cip30TxType.StakeVoteDelegation;
  }

  if (voteRegistrationDelegation) {
    return Wallet.Cip30TxType.VoteRegistrationDelegation;
  }

  if (stakeRegistrationDelegation) {
    return Wallet.Cip30TxType.StakeRegistrationDelegation;
  }

  if (stakeVoteDelegationRegistration) {
    return Wallet.Cip30TxType.StakeVoteDelegationRegistration;
  }

  if (dRepUpdate) {
    return Wallet.Cip30TxType.DRepUpdate;
  }

  return Wallet.Cip30TxType.Send;
};

export const pubDRepKeyToHash = async (
  pubDRepKeyHex: Wallet.Crypto.Ed25519PublicKeyHex
): Promise<Wallet.Crypto.Hash28ByteBase16> => {
  const pubDRepKey = await Wallet.Crypto.Ed25519PublicKey.fromHex(pubDRepKeyHex);
  const drepKeyHex = (await pubDRepKey.hash()).hex();
  return Wallet.Crypto.Hash28ByteBase16.fromEd25519KeyHashHex(drepKeyHex);
};

export const depositPaidWithSymbol = (deposit: bigint, coinId: Wallet.CoinId): string => {
  switch (coinId.name) {
    case cardanoCoin.name:
      return Wallet.util.getFormattedAmount({
        amount: deposit.toString(),
        cardanoCoin: coinId
      });
    default:
      throw new Error(`coinId ${coinId.name} not supported`);
  }
};

export const hasValidDrepRegistration = (history: Wallet.Cardano.HydratedTx[]): boolean => {
  for (const transaction of history) {
    const drepRegistrationOrRetirementCerticicate = transaction.body.certificates?.find((cert) =>
      [CertificateType.UnregisterDelegateRepresentative, CertificateType.RegisterDelegateRepresentative].includes(
        cert.__typename
      )
    );

    if (drepRegistrationOrRetirementCerticicate) {
      return drepRegistrationOrRetirementCerticicate.__typename === CertificateType.RegisterDelegateRepresentative;
    }
  }
  return false;
};
