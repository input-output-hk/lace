import '@testing-library/jest-dom';
import * as getImages from '../get-asset-image-url';

describe('Testing getAssetImageUrl function', () => {
  test('fortmatImgSrc', async () => {
    const params = {
      type: 'type',
      img: 'img'
    };
    expect(getImages.fortmatImgSrc(params)).toBe(`data:image/${params.type};base64,${params.img}`);
  });

  test('getAssetImageUrl', async () => {
    const fortmatImgSrcSpyResult = 'fortmatImgSrcSpy';
    const fortmatImgSrcSpy = jest.spyOn(getImages, 'fortmatImgSrc').mockReturnValueOnce(fortmatImgSrcSpyResult);

    expect(getImages.getAssetImageUrl('ipfs://image')).toBe('https://ipfs.blockfrost.dev/ipfs/image');
    expect(getImages.getAssetImageUrl('data:image/image')).toBe('data:image/image');
    expect(getImages.getAssetImageUrl('image')).toBe(fortmatImgSrcSpyResult);
    expect(fortmatImgSrcSpy).toBeCalledWith({ img: 'image', type: 'png' });
    expect(fortmatImgSrcSpy).toBeCalledTimes(1);

    fortmatImgSrcSpy.mockRestore();
  });
});
