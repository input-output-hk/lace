/* eslint-disable sonarjs/no-small-switch */
/* eslint-disable complexity */
import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { RemoteApiPropertyType, TransactionWitnessRequest, exposeApi } from '@cardano-sdk/web-extension';
import type { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS, cardanoCoin } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { VoterTypeEnum, getVoterType } from '@src/utils/tx-inspection';

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

export const getTxTypes = async (tx: Wallet.Cardano.Tx): Promise<Wallet.Cip30TxType[]> => {
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

  const types: Wallet.Cip30TxType[] = [];
  if (proposalProcedures) types.push(Wallet.Cip30TxType.ProposalProcedures);
  if (votingProcedures) types.push(Wallet.Cip30TxType.VotingProcedures);
  if (isMintTransaction) types.push(Wallet.Cip30TxType.Mint);
  if (isBurnTransaction) types.push(Wallet.Cip30TxType.Burn);
  if (dRepRegistration) types.push(Wallet.Cip30TxType.DRepRegistration);
  if (dRepRetirement) types.push(Wallet.Cip30TxType.DRepRetirement);
  if (voteDelegation) types.push(Wallet.Cip30TxType.VoteDelegation);
  if (stakeVoteDelegation) types.push(Wallet.Cip30TxType.StakeVoteDelegation);
  if (voteRegistrationDelegation) types.push(Wallet.Cip30TxType.VoteRegistrationDelegation);
  if (stakeRegistrationDelegation) types.push(Wallet.Cip30TxType.StakeRegistrationDelegation);
  if (stakeVoteDelegationRegistration) types.push(Wallet.Cip30TxType.StakeVoteDelegationRegistration);
  if (dRepUpdate) types.push(Wallet.Cip30TxType.DRepUpdate);

  if (types.length === 0) types.push(Wallet.Cip30TxType.Send);

  return types;
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

export const getDRepId = (voter: Wallet.Cardano.Voter): Wallet.Cardano.DRepID | string =>
  getVoterType(voter.__typename) === VoterTypeEnum.DREP
    ? drepIDasBech32FromHash(voter.credential.hash)
    : voter.credential.hash.toString();
