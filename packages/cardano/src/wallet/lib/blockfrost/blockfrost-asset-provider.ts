/* eslint-disable unicorn/no-null */
import { Asset, AssetProvider, Cardano, GetAssetArgs, GetAssetsArgs } from '@cardano-sdk/core';
import { BlockfrostClient } from './blockfrost-client';
import { BlockfrostProvider } from './blockfrost-provider';
import type { Responses } from '@blockfrost/blockfrost-js';
import { fetchSequentially } from './util';
import { isNotNil } from '@cardano-sdk/util';
import omit from 'lodash/omit';

// copied from @cardano-sdk/cardano-services and updated to use custom blockfrost client instead of blockfrost-js
export class BlockfrostAssetProvider extends BlockfrostProvider implements AssetProvider {
  constructor(client: BlockfrostClient) {
    super(client);
  }

  protected async getLastMintedTx(assetId: Cardano.AssetId): Promise<Responses['asset_history'][number] | undefined> {
    const [lastMintedTx] = await fetchSequentially({
      haveEnoughItems: (items: Responses['asset_history']): boolean => items.length > 0,
      paginationOptions: { order: 'desc' },
      request: (queryString) => this.request<Responses['asset_history']>(`assets/${assetId}/history?${queryString}`),
      responseTranslator: (response): Responses['asset_history'] => response.filter((tx) => tx.action === 'minted')
    });

    return lastMintedTx || undefined;
  }

  private mapNftMetadata(asset: Responses['asset']): Asset.NftMetadata | null {
    const image = (asset.onchain_metadata?.image as string | undefined) || asset.metadata?.logo;
    const name = (asset.onchain_metadata?.name as string | undefined) || asset.metadata?.name;
    if (!image || !name) return null;
    try {
      return {
        image: Asset.Uri(image),
        version: '1.0',
        name,
        description: (asset.onchain_metadata?.description as string | undefined) || asset.metadata?.description,
        otherProperties: this.mapNftMetadataOtherProperties(asset.onchain_metadata),
        files: Array.isArray(asset.onchain_metadata?.files)
          ? asset.onchain_metadata.files
              .map((file): Asset.NftMetadataFile | null => {
                const mediaType = file.mediaType as string | undefined;
                const fileName = file.name as string | undefined;
                const src = file.src as string | undefined;
                if (!src || !mediaType) return null;
                try {
                  return {
                    name: fileName,
                    src: Asset.Uri(src),
                    mediaType: Asset.MediaType(mediaType),
                    otherProperties: this.mapNftMetadataOtherProperties(file)
                  };
                } catch {
                  return null;
                }
              })
              // eslint-disable-next-line unicorn/no-array-callback-reference
              .filter(isNotNil)
          : undefined,
        mediaType: asset.onchain_metadata?.mediaType
          ? Asset.ImageMediaType(asset.onchain_metadata.mediaType as string)
          : undefined
      };
    } catch {
      return null;
    }
  }

  private objToMetadatum(obj: unknown): Cardano.Metadatum {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number') return BigInt(obj);
    if (typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map((item) => this.objToMetadatum(item));
      }
      return new Map(Object.entries(obj).map(([key, value]) => [key, this.objToMetadatum(value)]));
    }
    return '';
  }

  private mapNftMetadataOtherProperties(
    metadata: Responses['asset']['onchain_metadata']
  ): Map<string, Cardano.Metadatum> | undefined {
    if (!metadata) {
      return;
    }
    const otherProperties = Object.entries(
      omit(metadata, ['name', 'image', 'description', 'mediaType', 'files', 'version'])
    );
    if (otherProperties.length === 0) return;
    // eslint-disable-next-line consistent-return
    return new Map(otherProperties.map(([key, value]) => [key, this.objToMetadatum(value)]));
  }

  private mapTokenMetadata(assetId: Cardano.AssetId, asset: Responses['asset']): Asset.TokenMetadata {
    return {
      decimals: asset.metadata?.decimals,
      desc: asset.metadata?.description || (asset.onchain_metadata?.description as string | undefined),
      assetId,
      icon: asset.metadata?.logo || (asset.onchain_metadata?.image as string | undefined),
      name: asset.metadata?.name || (asset.onchain_metadata?.name as string | undefined),
      ticker: asset.metadata?.ticker,
      url: asset.metadata?.url,
      version: '1.0'
    };
  }

  async getAsset({ assetId, extraData }: GetAssetArgs): Promise<Asset.AssetInfo> {
    try {
      const response = await this.request<Responses['asset']>(`assets/${assetId.toString()}`);
      const name = Cardano.AssetId.getAssetName(assetId);
      const policyId = Cardano.PolicyId(response.policy_id);
      const quantity = BigInt(response.quantity);
      return {
        assetId,
        fingerprint: Cardano.AssetFingerprint(response.fingerprint),
        name,
        nftMetadata: extraData?.nftMetadata ? this.mapNftMetadata(response) : null,
        policyId,
        quantity,
        supply: quantity,
        tokenMetadata: extraData?.tokenMetadata ? this.mapTokenMetadata(assetId, response) : null
      };
    } catch (error) {
      throw this.toProviderError(error);
    }
  }

  getAssets({ assetIds, extraData }: GetAssetsArgs): Promise<Asset.AssetInfo[]> {
    return Promise.all(assetIds.map((assetId) => this.getAsset({ assetId, extraData })));
  }
}
