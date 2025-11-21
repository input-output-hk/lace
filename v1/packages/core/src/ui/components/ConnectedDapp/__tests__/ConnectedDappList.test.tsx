/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectedDappList, connectedDappListProps, LIST_TESTID } from '../ConnectedDappList';
import { DAPP_CONTAINER_TESTID } from '../ConnectedDapp';

const url =
  'addr_test1qrmavlv5c7za68rq6n6r0hrcqd604j9zsr6tycwtjf3lef0wc4p9nt0e0wwytcy30mxar65892w3k77e5g2uyhx29lhqjt267p';
const name = 'name';

describe('Testing WalletnameList component', () => {
  const total = 12;
  const props: connectedDappListProps = {
    items: Array.from({ length: total }, (_item, indx) => ({
      id: indx,
      logo: 'logo',
      name,
      url,
      onDelete: jest.fn()
    })),
    total
  };
  test('should render a list of 12 connected dapps', async () => {
    const { findByTestId, findAllByText } = render(<ConnectedDappList {...props} />);
    const list = await findByTestId(LIST_TESTID);
    const items = await within(list).findAllByTestId(DAPP_CONTAINER_TESTID);
    const urlText = await findAllByText(url);
    const nameText = await findAllByText(name);

    expect(items).toHaveLength(12);
    expect(urlText).toHaveLength(12);
    expect(nameText).toHaveLength(12);
  });

  test('should display an empty list message', async () => {
    const { findByTestId, queryAllByText } = render(<ConnectedDappList {...props} items={[]} emptyText={'no items'} />);
    const list = await findByTestId(LIST_TESTID);

    const message = await within(list).findByText(/no items/i);
    await waitFor(() => {
      expect(queryAllByText(url)).toHaveLength(0);
    });
    expect(message).toBeVisible();
  });
});
