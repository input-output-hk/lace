/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, within } from '@testing-library/react';
import { EditAddressForm, EditAddressFormProps } from '../EditAddressForm';
import '@testing-library/jest-dom';

describe('Testing AddressForm component', () => {
  const initialValues = {
    name: 'Wallet name',
    address:
      'addr_test1qq307xzukgj8s3ze0zsqpalst9uk26xevalnrqyuyfqgpszp99xu8w6jprv5aqvjkkmev8rzyucvrr5udk4yjaxexygsghpuca'
  };
  const nameErrorText = 'name error';
  const addressErrorText = 'address error';
  const props: EditAddressFormProps = {
    form: undefined,
    initialValues: {},
    validations: {
      name: jest.fn().mockReturnValue(nameErrorText),
      address: jest.fn().mockReturnValue(addressErrorText)
    },
    translations: {
      walletName: 'Wallet name',
      address: 'Address'
    }
  };

  test('should display empty name input, empty address input and action buttons', async () => {
    const { findByTestId } = render(<EditAddressForm {...props} />);

    const nameInput = await findByTestId('address-form-name-input');
    const addressInput = await findByTestId('address-form-address-input');

    expect(nameInput).toBeInTheDocument();
    expect(addressInput).toBeInTheDocument();
  });

  test('should display valid predefined wallet name and address', async () => {
    const { findByTestId } = render(<EditAddressForm {...props} initialValues={initialValues} />);

    const form = await findByTestId('address-form');
    // const btnsContainer = await findByTestId('address-form-buttons');
    const nameInput = await within(form).findByDisplayValue(initialValues.name);
    const addressInput = await within(form).findByDisplayValue(initialValues.address);

    expect(nameInput).toBeInTheDocument();
    expect(addressInput).toBeInTheDocument();
  });
});
