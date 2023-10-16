import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { CardanoTxOut } from '@src/types';
import { RemoteApiPropertyType, exposeApi } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { sectionTitle, DAPP_VIEWS } from '../../config';

const { CertificateType } = Wallet.Cardano;

const DAPP_TOAST_DURATION = 50;

export enum TxType {
  Send = 'Send',
  Mint = 'Mint',
  Burn = 'Burn',
  DRepRegistration = 'DRepRegistration',
  DRepRetirement = 'DRepRetirement',
  VoteDelegation = 'VoteDelegation'
}

export const getTitleKey = (txType: TxType): string => {
  if (txType === TxType.DRepRegistration) {
    return 'core.drepRegistration.title';
  }

  if (txType === TxType.DRepRetirement) {
    return 'core.drepRetirement.title';
  }

  if (txType === TxType.VoteDelegation) {
    return 'core.voteDelegation.title';
  }

  return sectionTitle[DAPP_VIEWS.CONFIRM_TX];
};

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

export const getTransactionAssetsId = (outputs: CardanoTxOut[]): Wallet.Cardano.AssetId[] => {
  const assetIds: Wallet.Cardano.AssetId[] = [];
  const assetMaps = outputs.map((output) => output.value.assets);
  for (const asset of assetMaps) {
    if (asset) {
      for (const id of asset.keys()) {
        !assetIds.includes(id) && assetIds.push(id);
      }
    }
  }
  return assetIds;
};

export const certificateInspectorFactory =
  <T extends Wallet.Cardano.Certificate>(type: Wallet.Cardano.CertificateType) =>
  (tx: Wallet.Cardano.Tx): T | undefined =>
    tx?.body?.certificates?.find((certificate) => certificate.__typename === type) as T | undefined;

export const getTxType = (tx: Wallet.Cardano.Tx): TxType => {
  const inspector = createTxInspector({
    minted: assetsMintedInspector,
    burned: assetsBurnedInspector,
    dRepRegistration: certificateInspectorFactory(CertificateType.RegisterDelegateRepresentative),
    dRepRetirement: certificateInspectorFactory(CertificateType.UnregisterDelegateRepresentative),
    voteDelegation: certificateInspectorFactory(CertificateType.VoteDelegation)
  });

  const { minted, burned, dRepRegistration, dRepRetirement, voteDelegation } = inspector(
    tx as Wallet.Cardano.HydratedTx
  );
  const isMintTransaction = minted.length > 0;
  const isBurnTransaction = burned.length > 0;

  if (isMintTransaction) {
    return TxType.Mint;
  }

  if (isBurnTransaction) {
    return TxType.Burn;
  }

  if (dRepRegistration) {
    return TxType.DRepRegistration;
  }

  if (dRepRetirement) {
    return TxType.DRepRetirement;
  }

  if (voteDelegation) {
    return TxType.VoteDelegation;
  }

  return TxType.Send;
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

export const getOwnRetirementMessageKey = (isOwnRetirement: boolean | undefined): string => {
  if (isOwnRetirement === undefined) {
    return '';
  }
  return isOwnRetirement ? 'core.drepRetirement.isOwnRetirement' : 'core.drepRetirement.isNotOwnRetirement';
};
