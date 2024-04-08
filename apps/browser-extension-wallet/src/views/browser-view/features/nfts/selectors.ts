/* eslint-disable react-hooks/rules-of-hooks */
import { NftDetailProps } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import i18n from 'i18next';
import { EnvironmentTypes } from '@stores';
import { AssetOrHandleInfo } from '@hooks';
import { getAssetImage } from '@src/utils/get-asset-image';
import { useNftsFoldersContext } from '@src/features/nfts/context';
import { NftFoldersSchema } from '@lib/storage';

export const nftImageSelector = (imageUri: Wallet.Asset.Uri | Wallet.Asset.Uri[]): string | undefined => {
  const uri = Array.isArray(imageUri) ? imageUri[0] : imageUri;

  return uri ? getAssetImageUrl(uri.toString()) : undefined;
};

const JSON_INDENTATION = 2;

const nftAttributesSelector = (metadata: Map<string, Wallet.Cardano.Metadatum>): string | undefined => {
  const metadataRecord: Record<string, string | unknown[] | Record<string, unknown>> = {};

  for (const [key, value] of metadata.entries()) {
    metadataRecord[key] = Wallet.cardanoMetadatumToObj(value);
  }

  return JSON.stringify(metadataRecord, undefined, JSON_INDENTATION);
};

export const nftDetailSelector = (asset: AssetOrHandleInfo): NftDetailProps => {
  const image = nftImageSelector(getAssetImage(asset));
  const { list } = useNftsFoldersContext();

  const selectedFolder: Partial<NftFoldersSchema> | undefined = list?.find((folder: NftFoldersSchema) =>
    folder.assets.includes(asset.assetId)
  );
  const { otherProperties } = asset.nftMetadata || {};

  return {
    image,
    tokenInformation: [
      {
        name: 'Policy ID',
        value: asset.policyId.toString()
      },
      {
        name: 'Asset ID',
        value: asset.assetId.toString()
      },
      {
        name: 'Media URL',
        value: image
      }
    ],
    folder: selectedFolder?.name,
    attributes: otherProperties ? nftAttributesSelector(otherProperties) : undefined,
    translations: {
      tokenInformation: i18n.t('core.nftDetail.tokenInformation'),
      attributes: i18n.t('core.nftDetail.attributes'),
      directory: i18n.t('core.nftDetail.directory')
    }
  };
};

export const nftNameSelector = ({ nftMetadata }: Wallet.Asset.AssetInfo, environmentName: EnvironmentTypes): string =>
  nftMetadata?.name || `SingleNFT${environmentName || ''}`;
