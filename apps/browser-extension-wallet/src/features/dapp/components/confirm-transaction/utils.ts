import { Wallet } from '@lace/cardano';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { CardanoTxOut } from '@src/types';
import { RemoteApiPropertyType, exposeApi } from '@cardano-sdk/web-extension';
import { UserPromptService } from '@lib/scripts/background/services';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { of } from 'rxjs';
import { sectionTitle, DAPP_VIEWS } from '../../config';

const DAPP_TOAST_DURATION = 50;

export enum TxType {
  Send = 'Send',
  Mint = 'Mint',
  Burn = 'Burn',
  DRepRegistration = 'DRepRegistration',
  DRepRetirement = 'DRepRetirement'
}

export const getTitleKey = (txType: TxType): string => {
  if (txType === TxType.DRepRegistration) {
    return 'core.drepRegistration.title';
  }

  if (txType === TxType.DRepRetirement) {
    return 'core.drepRetirement.title';
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

const isDRepRegistrationCertificate = (type: Wallet.Cardano.CertificateType) =>
  type === Wallet.Cardano.CertificateType.RegisterDelegateRepresentative;

const isDRepRetirementCertificate = (type: Wallet.Cardano.CertificateType) =>
  type === Wallet.Cardano.CertificateType.UnregisterDelegateRepresentative;

export const dRepRegistrationInspector = (
  tx: Wallet.Cardano.Tx
): Wallet.Cardano.RegisterDelegateRepresentativeCertificate | undefined =>
  tx?.body?.certificates?.find(({ __typename }) => isDRepRegistrationCertificate(__typename)) as
    | Wallet.Cardano.RegisterDelegateRepresentativeCertificate
    | undefined;

export const dRepRetirementInspector = (
  tx: Wallet.Cardano.Tx
): Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate | undefined =>
  tx?.body?.certificates?.find(({ __typename }) => isDRepRetirementCertificate(__typename)) as
    | Wallet.Cardano.UnRegisterDelegateRepresentativeCertificate
    | undefined;

export const getTxType = (tx: Wallet.Cardano.Tx): TxType => {
  const inspector = createTxInspector({
    minted: assetsMintedInspector,
    burned: assetsBurnedInspector,
    dRepRegistration: dRepRegistrationInspector,
    dRepRetirement: dRepRetirementInspector
  });

  const { minted, burned, dRepRegistration, dRepRetirement } = inspector(tx as Wallet.Cardano.HydratedTx);
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

  return TxType.Send;
};

export const drepIDasBech32FromHash = (value: Wallet.Crypto.Hash28ByteBase16) =>
  Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(value)));

export const buildDRepIDFromDRepKey = (
  dRepKey: Wallet.Crypto.Ed25519PublicKeyHex,
  networkId: Wallet.Cardano.NetworkId = Wallet.Cardano.NetworkId.Testnet
): Wallet.Cardano.DRepID => {
  const dRepKeyBytes = Buffer.from(dRepKey, 'hex');
  // eslint-disable-next-line no-magic-numbers
  const dRepIdHex = Wallet.Crypto.blake2b(28).update(dRepKeyBytes).digest('hex');
  const paymentAddress = Wallet.Cardano.EnterpriseAddress.packParts({
    networkId,
    paymentPart: {
      hash: Wallet.Crypto.Hash28ByteBase16(dRepIdHex),
      type: Wallet.Cardano.CredentialType.KeyHash
    },
    type: Wallet.Cardano.AddressType.EnterpriseKey
  });
  return Wallet.HexBlob.toTypedBech32<Wallet.Cardano.DRepID>('drep', Wallet.HexBlob.fromBytes(paymentAddress));
};
