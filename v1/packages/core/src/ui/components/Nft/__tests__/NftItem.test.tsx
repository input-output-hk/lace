import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NftItem, NftItemProps } from '../NftItem';
import { NftsItemsTypes } from '../NftFolderItem';

describe('Testing NftItem component', () => {
  const props: NftItemProps = {
    type: NftsItemsTypes.NFT,
    name: 'Space Budz #847',
    onClick: jest.fn()
  };

  test('should render a NFT item', async () => {
    const { findByTestId } = render(<NftItem {...props} />);
    const nftName = await findByTestId('nft-item-name');
    expect(nftName).toBeVisible();
  });

  test('should call the onClick function when clicking the item', async () => {
    const { findByTestId } = render(<NftItem {...props} />);
    const item = await findByTestId('nft-item');
    fireEvent.click(item);
    expect(props.onClick).toHaveBeenCalled();
  });
});
