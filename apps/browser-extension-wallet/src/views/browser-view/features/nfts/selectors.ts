import { NftDetailProps } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import i18n from 'i18next';
import { EnvironmentTypes } from '@stores';

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

export const nftDetailSelector = ({ policyId, assetId, nftMetadata }: Wallet.Asset.AssetInfo): NftDetailProps => {
  const image = nftImageSelector(nftMetadata?.image);

  const { otherProperties } = nftMetadata || {};

  return {
    image,
    tokenInformation: [
      {
        name: 'Policy ID',
        value: policyId.toString()
      },
      {
        name: 'Asset ID',
        value: assetId.toString()
      },
      {
        name: 'Media URL',
        value: image
      }
    ],
    attributes: otherProperties ? nftAttributesSelector(otherProperties) : undefined,
    translations: {
      tokenInformation: i18n.t('core.nftDetail.tokenInformation'),
      attributes: i18n.t('core.nftDetail.attributes')
    }
  };
};

export const nftNameSelector = ({ nftMetadata }: Wallet.Asset.AssetInfo, environmentName: EnvironmentTypes): string =>
  nftMetadata?.name || `SingleNFT${environmentName || ''}`;
