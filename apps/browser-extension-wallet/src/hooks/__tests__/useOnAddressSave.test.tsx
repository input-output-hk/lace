/* eslint-disable import/imports-first */

const mockUpdateRecord = jest.fn();
const mockSaveRecord = jest.fn();
const mockUseAddressBookContext = jest.fn(() => ({
  utils: {
    saveRecord: mockSaveRecord,
    updateRecord: mockUpdateRecord
  }
}));

const mockUseHandleResolver = jest.fn(() => jest.fn());

const mockSendEventToMatomo = jest.fn();

import { renderHook, act } from '@testing-library/react-hooks';
import { I18nextProvider } from 'react-i18next';
import i18n from '@lib/i18n';
import { useOnAddressSave } from '../useOnAddressSave';
import React from 'react';

jest.mock('@providers/AnalyticsProvider', () => ({
  useAnalyticsContext: () => ({
    sendEventToMatomo: mockSendEventToMatomo
  })
}));
jest.mock('@src/features/address-book/context', () => ({
  useAddressBookContext: mockUseAddressBookContext
}));
jest.mock('../useHandleResolver', () => ({
  useHandleResolver: mockUseHandleResolver
}));

describe('useOnAddressSave hook', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should call update an address if address already has an ID', async () => {
    const { result } = renderHook(() => useOnAddressSave(), { wrapper });

    const addressToEdit = {
      id: 'addressId',
      name: 'editable address',
      address: 'addr_'
    };

    const addressToSave = { id: 'addressId', name: 'editable address', address: 'addr_' };

    const { onSaveAddressActions } = result.current;

    await act(async () => {
      await onSaveAddressActions(addressToSave, addressToEdit);
    });

    expect(mockSendEventToMatomo).toHaveBeenCalledWith({
      category: 'address-book',
      action: 'click-event',
      name: 'add-address-browser'
    });

    expect(mockUpdateRecord).toHaveBeenCalledWith(addressToEdit.id, addressToSave, {
      text: 'Edited successfully',
      icon: 'div'
    });
  });

  it('should call save an address if address has no ID', async () => {
    const { result } = renderHook(() => useOnAddressSave(), { wrapper });

    const addressToEdit = {
      name: 'editable address',
      address: 'addr_'
    };

    const addressToSave = { id: 'addressId', name: 'editable address', address: 'addr_' };

    const { onSaveAddressActions } = result.current;

    await act(async () => {
      await onSaveAddressActions(addressToSave, addressToEdit);
    });

    expect(mockSaveRecord).toHaveBeenCalledWith(addressToSave, {
      text: 'Address added',
      icon: 'div'
    });
  });
});
