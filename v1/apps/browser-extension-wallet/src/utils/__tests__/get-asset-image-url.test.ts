import '@testing-library/jest-dom';
import * as getImages from '../get-asset-image-url';

describe('Testing getAssetImageUrl function', () => {
  test('formatDataUrl', async () => {
    const params = {
      type: 'type',
      img: 'img'
    };
    expect(getImages.formatDataUrl(params)).toBe(`data:image/${params.type};base64,${params.img}`);
  });

  test('getAssetImageUrl', async () => {
    const formatDataUrlSpyResult = 'formatDataUrlSpy';
    const formatDataUrlSpy = jest.spyOn(getImages, 'formatDataUrl').mockReturnValueOnce(formatDataUrlSpyResult);

    expect(getImages.getAssetImageUrl('https://somecdn.com/image.png')).toBe('https://somecdn.com/image.png');
    expect(getImages.getAssetImageUrl('ipfs://image')).toBe('https://ipfs.blockfrost.dev/ipfs/image');
    expect(getImages.getAssetImageUrl('ipfs://ipfs/image')).toBe('https://ipfs.blockfrost.dev/ipfs/image');
    expect(getImages.getAssetImageUrl('data:image/image')).toBe('data:image/image');
    expect(getImages.getAssetImageUrl('image')).toBe(formatDataUrlSpyResult);
    expect(formatDataUrlSpy).toBeCalledWith({ img: 'image', type: 'png' });
    expect(formatDataUrlSpy).toBeCalledTimes(1);

    formatDataUrlSpy.mockRestore();
  });
});
