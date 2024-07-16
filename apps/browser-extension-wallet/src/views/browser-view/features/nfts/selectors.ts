/* eslint-disable react-hooks/rules-of-hooks */
import { NftDetailProps } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import i18n from 'i18next';
import { AssetOrHandleInfo } from '@hooks';
import { getAssetImage } from '@src/utils/get-asset-image';
import { useNftsFoldersContext } from '@src/features/nfts/context';
import { NftFoldersSchema } from '@lib/storage';
import { addEllipsis } from '@lace/common';

const DISPLAY_FALLBACK = '-';
const NAME_TRUNCATE_LENGTH = 10;
const NAME_TRUNCATE_TRAILING_CHARS = 4;

/**
 * Converts a Cardano asset name to a UTF-8 string.
 *
 * @param value - The asset name to convert.
 * @returns The UTF-8 representation of the asset name, or undefined if the conversion fails.
 */
const assetNameToUtf8 = (value: Wallet.Cardano.AssetName): string | undefined => {
  let result;

  try {
    result = Wallet.Cardano.AssetName.toUTF8(value);
  } catch {
    result = undefined;
  }

  return result;
};

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
      directory: i18n.t('core.nftDetail.directory'),
      setAsAvatar: i18n.t('core.nftDetail.setAsAvatar')
    }
  };
};

export const nftNameSelector = ({ nftMetadata, tokenMetadata, name }: Wallet.Asset.AssetInfo): string =>
  nftMetadata?.name ||
  tokenMetadata?.name ||
  assetNameToUtf8(name) ||
  addEllipsis(name || DISPLAY_FALLBACK, NAME_TRUNCATE_LENGTH, NAME_TRUNCATE_TRAILING_CHARS);
