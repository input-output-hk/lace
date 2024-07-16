/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import { AddressForm, AddressFormProps } from '../AddressForm';
import '@testing-library/jest-dom';

import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../../../../../../lib/i18n';
import { buildMockProviders } from '@src/utils/mocks/context-providers';

jest.mock('react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/crypto/address-book' })
}));

describe('Testing AddressForm component', () => {
  const props: AddressFormProps = {
    initialValues: {
      name: 'name',
      address:
        'addr_test1qq307xzukgj8s3ze0zsqpalst9uk26xevalnrqyuyfqgpszp99xu8w6jprv5aqvjkkmev8rzyucvrr5udk4yjaxexygsghpuca'
    },
    onConfirmClick: jest.fn()
  };

  test('should render drawer with address form', async () => {
    const { MockProviders } = await buildMockProviders();
    const { findByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <MockProviders>
          <AddressForm {...props} />
        </MockProviders>
      </I18nextProvider>
    );

    const form = await findByTestId('address-form');
    const actions = await findByTestId('address-form-buttons');
    const submitBtn = await within(actions).findByText('Add address');

    expect(form).toBeVisible();
    expect(submitBtn).not.toBeDisabled();

    fireEvent.submit(form);

    await waitFor(() => {
      expect(props.onConfirmClick).toHaveBeenCalledWith(props.initialValues);
    });
  });
});
