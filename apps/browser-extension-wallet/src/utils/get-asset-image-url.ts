export const formatDataUrl = (params: { img: string; type: string }): string =>
  `data:image/${params.type};base64,${params.img}`;

export const getAssetImageUrl = (image: string): string => {
  if (image.startsWith('http')) return image;
  if (image.startsWith('data:image/')) return image;
  if (image.startsWith('ipfs')) {
    return `${process.env.BLOCKFROST_IPFS_URL}/ipfs/${image.replace('ipfs://', '').replace('ipfs/', '')}`;
  }

  // consider detecting the image mime type from base64 hash
  return formatDataUrl({ img: image, type: 'png' });
};
