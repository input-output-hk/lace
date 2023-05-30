import * as React from 'react';
import { render, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ConnectedDapp,
  connectedDappProps,
  DAPP_CONTAINER_TESTID,
  LOGO_TESTID,
  DELETE_ICON_TESTID
} from '../ConnectedDapp';

describe('Testing ConnectedDapp component', () => {
  const props: connectedDappProps = {
    name: 'Hosky Swap',
    url: 'https://hosky-swap.io',
    logo: 'image',
    onDelete: jest.fn()
  };

  test('should render connected dapp item', async () => {
    const { findByTestId } = render(<ConnectedDapp {...props} />);
    const dapp = await findByTestId(DAPP_CONTAINER_TESTID);

    const logo = await findByTestId(LOGO_TESTID);
    const deleteIcon = await findByTestId(DELETE_ICON_TESTID);
    const urlText = await within(dapp).findByText(props.url);

    expect(logo).toBeVisible();
    expect(deleteIcon).toBeVisible();
    expect(urlText).toBeVisible();
  });

  test('should call the onDelete function when clicking the delete icon', async () => {
    const { findByTestId } = render(<ConnectedDapp {...props} />);
    const item = await findByTestId(DELETE_ICON_TESTID);
    fireEvent.click(item);
    expect(props.onDelete).toHaveBeenCalled();
  });
});
