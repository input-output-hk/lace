/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, within } from '@testing-library/react';
import { AddressBookEmpty } from '../AddressBookEmpty';
import '@testing-library/jest-dom';

import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../../../../../../lib/i18n';

jest.mock('react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/crypto/address-book' })
}));

const titleText = /you don't have any saved addresses/i;
const subtitleText = /save your favorites to your address book for easy access right here/i;

describe('Testing AddressBookEmpty component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should render image, proper title and add new address button', async () => {
    const { findByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <AddressBookEmpty />
      </I18nextProvider>
    );

    const container = await findByTestId('address-book-empty');
    const image = await within(container).findByTestId('address-book-empty-state-image');
    const title = await within(container).findByText(titleText);
    const subtitle = await within(container).findByText(subtitleText);

    expect(image).toBeVisible();
    expect(title).toBeVisible();
    expect(subtitle).toBeVisible();
  });
});
