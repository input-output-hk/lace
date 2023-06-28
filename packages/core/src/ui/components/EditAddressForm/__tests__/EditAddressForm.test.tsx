import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { EditAddressForm } from '../EditAddressForm';
import { FormInstance } from 'antd';
import { mockDeep } from 'jest-mock-extended';

const mockForm = mockDeep<FormInstance>();

const mockInitialValues = {
  name: 'John Doe',
  address:
    'addr_test1qq307xzukgj8s3ze0zsqpalst9uk26xevalnrqyuyfqgpszp99xu8w6jprv5aqvjkkmev8rzyucvrr5udk4yjaxexygsghpuca'
};

const nameErrorText = 'name error';
const addressErrorText = 'address error';
const handleErrorText = 'handle error';

const mockValidations = {
  name: jest.fn().mockReturnValue(nameErrorText),
  address: jest.fn().mockReturnValue(addressErrorText),
  handle: jest.fn().mockReturnValue(handleErrorText)
};

const mockTranslations = {
  walletName: 'Wallet Name',
  address: 'Address'
};

xdescribe('EditAddressForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the form with initial values', async () => {
    const { findByTestId } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    expect(await findByTestId('address-form')).toBeInTheDocument();
    expect(await findByTestId('address-form-name-input')).toHaveValue('John Doe');
    expect(await findByTestId('address-form-address-input')).toHaveValue(mockInitialValues.address);
  });

  test('calls nameValidator on name input change', async () => {
    const { findByTestId } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    const nameInput = await findByTestId('address-form-name-input');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    expect(mockValidations.name).toHaveBeenCalledWith('New Name', expect.any(Object), expect.any(Function));
  });

  test('calls addressValidator when address input is not a handle', () => {
    const { getByLabelText } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    const addressInput = getByLabelText('Address');
    fireEvent.change(addressInput, { target: { value: mockInitialValues.address } });

    expect(mockValidations.address).toHaveBeenCalledWith(
      mockInitialValues.address,
      expect.any(Object),
      expect.any(Function)
    );
  });

  test('calls handleValidator when address input is a handle', () => {
    mockForm.getFieldError.mockReturnValueOnce(['Invalid address']);
    const { getByLabelText } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    const addressInput = getByLabelText('Address');
    fireEvent.change(addressInput, { target: { value: 'myhandle' } });

    expect(mockValidations.handle).toHaveBeenCalledWith('myhandle', expect.any(Object), expect.any(Function));
  });

  test('displays valid icon when address field is valid', () => {
    mockForm.getFieldError.mockReturnValueOnce([]);
    const { getByLabelText, getByTestId } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    const addressInput = getByLabelText('Address');
    fireEvent.change(addressInput, { target: { value: mockInitialValues.address } });

    const validIcon = getByTestId('valid-icon');
    expect(validIcon).toBeInTheDocument();
  });
  test('displays valid icon when address field is invalid', () => {
    mockForm.getFieldError.mockReturnValueOnce(['error']);
    const { getByLabelText, getByTestId } = render(
      <EditAddressForm
        form={mockForm}
        initialValues={mockInitialValues}
        validations={mockValidations}
        translations={mockTranslations}
      />
    );

    const addressInput = getByLabelText('Address');
    fireEvent.change(addressInput, { target: { value: mockInitialValues.address } });

    const invalidIcon = getByTestId('invalid-icon');
    expect(invalidIcon).toBeInTheDocument();
  });
});
