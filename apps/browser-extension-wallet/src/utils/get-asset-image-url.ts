export const fortmatImgSrc = (params: { img: string; type: string }): string =>
  `data:image/${params.type};base64,${params.img}`;

export const getAssetImageUrl = (image: string): string => {
  if (image.startsWith('ipfs')) {
    return `https://ipfs.blockfrost.dev/ipfs/${image.replace('ipfs://', '').replace('ipfs/', '')}`;
  }

  if (image.startsWith('data:image/')) return image;

  return fortmatImgSrc({ img: image, type: 'png' });
};
