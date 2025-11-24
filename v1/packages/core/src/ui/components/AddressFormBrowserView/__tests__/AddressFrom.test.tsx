/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, within, fireEvent, waitFor } from '@testing-library/react';
import { AddressFormBrowserView, AddressFormPropsBrowserView } from '../AddressForm';
import '@testing-library/jest-dom';

describe('Testing AddressForm component', () => {
  const initialValues = {
    name: 'Wallet name',
    address:
      'addr_test1qq307xzukgj8s3ze0zsqpalst9uk26xevalnrqyuyfqgpszp99xu8w6jprv5aqvjkkmev8rzyucvrr5udk4yjaxexygsghpuca'
  };
  const nameErrorText = 'name error';
  const addressErrorText = 'address error';
  const handleErrorText = 'handle error';
  const props: AddressFormPropsBrowserView = {
    initialValues: {},
    onConfirmClick: jest.fn(),
    validations: {
      name: jest.fn().mockReturnValue(nameErrorText),
      address: jest.fn().mockReturnValue(addressErrorText),
      handle: jest.fn().mockReturnValue(handleErrorText)
    },
    translations: {
      addAddress: 'Add address',
      name: 'Name',
      address: 'Address',
      addNew: 'Add new',
      addNewSubtitle: 'Save your favorite addresses to easily find them'
    }
  };

  test('should display empty name input, empty address input and action buttons', async () => {
    const { findByTestId } = render(<AddressFormBrowserView {...props} />);

    const nameInput = await findByTestId('address-form-name-input');
    const addressInput = await findByTestId('address-form-address-input');
    const btnsContainer = await findByTestId('address-form-buttons');
    const confirmBtn = await within(btnsContainer).findByText(/add address/i);

    expect(nameInput).toBeInTheDocument();
    expect(addressInput).toBeInTheDocument();
    expect(confirmBtn).toBeInTheDocument();
  });

  test('should display valid predefined wallet name and address', async () => {
    const { findByTestId } = render(<AddressFormBrowserView {...props} initialValues={initialValues} />);

    const form = await findByTestId('address-form');
    const nameInput = await within(form).findByDisplayValue(initialValues.name);
    const addressInput = await within(form).findByDisplayValue(initialValues.address);

    expect(nameInput).toBeInTheDocument();
    expect(addressInput).toBeInTheDocument();
  });

  test('should disable confirm btn and show error messages when invalid and submitted', async () => {
    const { findByTestId, getByText } = render(<AddressFormBrowserView {...props} />);

    const form = await findByTestId('address-form');

    expect(getByText(/add address/i).closest('button')).toBeDisabled();
    fireEvent.submit(form);

    await waitFor(async () => {
      expect(props.onConfirmClick).not.toHaveBeenCalled();
    });
  });

  test('should call confirm and cancel when submitted and valid ', async () => {
    const validations = {
      name: jest.fn().mockReturnValue(undefined),
      address: jest.fn().mockReturnValue(undefined),
      handle: jest.fn().mockReturnValue(undefined)
    };
    const { findByTestId, queryAllByText } = render(
      <AddressFormBrowserView {...props} initialValues={initialValues} validations={validations} />
    );

    const form = await findByTestId('address-form');

    fireEvent.submit(form);

    await waitFor(async () => {
      expect(queryAllByText(nameErrorText)).toHaveLength(0);
      expect(queryAllByText(addressErrorText)).toHaveLength(0);
      expect(validations.name).toHaveBeenCalledWith(initialValues.name);
      expect(validations.address).toHaveBeenCalledWith(initialValues.address);
      expect(props.onConfirmClick).toHaveBeenCalled();
    });
  });
});
