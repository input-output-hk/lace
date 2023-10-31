/* eslint-disable no-console, complexity */
import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { RemoteApiPropertyType, exposeApi } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { sectionTitle, DAPP_VIEWS } from '../../config';

const { CertificateType } = Wallet.Cardano;

const DAPP_TOAST_DURATION = 50;

export const getTitleKey = (txType: Wallet.Cip30TxType): string =>
  [
    Wallet.Cip30TxType.DRepRegistration,
    Wallet.Cip30TxType.DRepRetirement,
    Wallet.Cip30TxType.DRepUpdate,
    Wallet.Cip30TxType.VoteDelegation,
    Wallet.Cip30TxType.VotingProcedures,
    Wallet.Cip30TxType.StakeVoteDelegation,
    Wallet.Cip30TxType.VoteRegistrationDelegation,
    Wallet.Cip30TxType.StakeRegistrationDelegation,
    Wallet.Cip30TxType.StakeVoteDelegationRegistration
  ].includes(txType)
    ? `core.${txType}.title`
    : sectionTitle[DAPP_VIEWS.CONFIRM_TX];

export const disallowSignTx = (close = false): void => {
  exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
    {
      api$: of({
        async allowSignTx(): Promise<boolean> {
          return Promise.reject();
        }
      }),
      baseChannel: DAPP_CHANNELS.userPrompt,
      properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
    },
    { logger: console, runtime }
  );
  close && setTimeout(() => window.close(), DAPP_TOAST_DURATION);
};

export const allowSignTx = (): void => {
  exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
    {
      api$: of({
        async allowSignTx(): Promise<boolean> {
          return Promise.resolve(true);
        }
      }),
      baseChannel: DAPP_CHANNELS.userPrompt,
      properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
    },
    { logger: console, runtime }
  );
};

export const certificateInspectorFactory =
  <T extends Wallet.Cardano.Certificate>(type: Wallet.Cardano.CertificateType) =>
  (tx: Wallet.Cardano.Tx): T | undefined =>
    tx?.body?.certificates?.find((certificate) => certificate.__typename === type) as T | undefined;

export const votingProceduresInspector = (tx: Wallet.Cardano.Tx): Wallet.Cardano.VotingProcedures | undefined =>
  tx?.body?.votingProcedures;

// eslint-disable-next-line complexity
export const proposalProceduresInspector = (tx: Wallet.Cardano.Tx): Wallet.Cardano.ProposalProcedure[] | undefined =>
  tx?.body?.proposalProcedures;

export const getTxType = (tx: Wallet.Cardano.Tx): Wallet.Cip30TxType => {
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
  } = inspector(tx as Wallet.Cardano.HydratedTx);
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

export const drepIDasBech32FromHash = (value: Wallet.Crypto.Hash28ByteBase16): Wallet.Cardano.DRepID =>
  Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(value)));

export const pubDRepKeyToHash = async (
  pubDRepKeyHex: Wallet.Crypto.Ed25519PublicKeyHex
): Promise<Wallet.Crypto.Hash28ByteBase16> => {
  const pubDRepKey = await Wallet.Crypto.Ed25519PublicKey.fromHex(pubDRepKeyHex);
  const drepKeyHex = (await pubDRepKey.hash()).hex();
  return Wallet.Crypto.Hash28ByteBase16.fromEd25519KeyHashHex(drepKeyHex);
};
