/* eslint-disable sonarjs/no-small-switch */
/* eslint-disable complexity */
import { Wallet } from '@lace/cardano';
import { RemoteApiPropertyType, TransactionWitnessRequest, WalletType, exposeApi } from '@cardano-sdk/web-extension';
import type { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS, cardanoCoin } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { logger } from '@lace/common';

const { CertificateType } = Wallet.Cardano;

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
    { logger, runtime }
  );
};

export const disallowSignTx = async (
  req: TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>,
  close = false
): Promise<void> => {
  try {
    await req?.reject('User declined to sign');
  } finally {
    close && window.close();
  }
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
