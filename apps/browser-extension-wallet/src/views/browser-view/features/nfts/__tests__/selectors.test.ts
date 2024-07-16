import { nftImageSelector } from '../selectors';
import { Wallet } from '@lace/cardano';

describe('Testing nftImageSelector', () => {
  test('should convert ipfs address', () => {
    const imageUri = 'ipfs://nft-address' as unknown as Wallet.Asset.Uri;
    const image = nftImageSelector(imageUri);

    expect(image).toBe('https://ipfs.blockfrost.dev/ipfs/nft-address');
  });
});
