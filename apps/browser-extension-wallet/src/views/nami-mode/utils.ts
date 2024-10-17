import { Milliseconds, TimeoutError } from '@cardano-sdk/core';
import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
export const isNamiWallet = (wallet?: Wallet.CardanoWallet): boolean => {
  if (!wallet || wallet.source.wallet.type !== WalletType.InMemory) return false;

  return !wallet.source.wallet.encryptedSecrets.keyMaterial.toString();
};

/** Copied from @cardano-js-sdk packages/core/src/util/promiseTimeout.ts  */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const promiseTimeout = async <T>(promise: Promise<T>, timeout: number) => {
  let timeoutId: NodeJS.Timeout;

  try {
    return await Promise.race([
      promise,
      // eslint-disable-next-line promise/param-names
      new Promise<T>(
        (_, reject) =>
          (timeoutId = setTimeout(() => reject(new TimeoutError('Failed to resolve the promise in time')), timeout))
      )
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/** Copied from @cardano-js-sdk packages/core/src/util/tryGetAssetInfos.ts */
type TryGetAssetInfosProps = {
  assetIds: Wallet.Cardano.AssetId[];
  assetProvider: Wallet.AssetProvider;
  timeout: Milliseconds;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const tryGetAssetInfos = async ({ assetIds, assetProvider, timeout }: TryGetAssetInfosProps) => {
  try {
    return await promiseTimeout(
      assetProvider.getAssets({
        assetIds,
        extraData: { nftMetadata: true, tokenMetadata: true }
      }),
      timeout
    );
  } catch (error) {
    console.error('Error: Failed to retrieve assets', error);

    return assetIds.map<Wallet.Asset.AssetInfo>((assetId) => {
      const policyId = Wallet.Cardano.AssetId.getPolicyId(assetId);
      const name = Wallet.Cardano.AssetId.getAssetName(assetId);

      return {
        assetId,
        fingerprint: Wallet.Cardano.AssetFingerprint.fromParts(policyId, name),
        name,
        policyId,
        quantity: BigInt(0),
        supply: BigInt(0)
      };
    });
  }
};
