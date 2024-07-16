export const fortmatImgSrc = (params: { img: string; type: string }): string =>
  `data:image/${params.type};base64,${params.img}`;

export const getAssetImageUrl = (image: string): string => {
  if (image.startsWith('ipfs')) {
    return image.replace('ipfs://', 'https://ipfs.blockfrost.dev/ipfs/');
  }

  if (image.startsWith('data:image/')) return image;

  return fortmatImgSrc({ img: image, type: 'png' });
};
