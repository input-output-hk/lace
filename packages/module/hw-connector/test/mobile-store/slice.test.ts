import { describe, expect, it } from 'vitest';

import {
  hwConnectorMobileActions,
  hwConnectorMobileReducers,
  hwConnectorMobileSelectors,
} from '../../src/mobile-store/slice';

import type { HwConnectorMobileState } from '../../src/mobile-store/slice';
import type { TranslationKey } from '@lace-contract/i18n';
import type { FoundDevice } from '@lace-lib/util-hw';

const reducer = hwConnectorMobileReducers['hw-connector-mobile'];
const actions = hwConnectorMobileActions.hwConnectorMobile;

const idleState: HwConnectorMobileState = { status: 'Idle' };
const searchingState: HwConnectorMobileState = {
  status: 'Searching',
  devices: [],
};

const bleDevice: FoundDevice = {
  deviceDescriptor: {
    kind: 'ble',
    vendorName: 'ledger',
    id: 'AA:BB',
    name: 'Ledger',
  },
  displayName: 'Ledger',
  icon: 'CellularNetwork',
};

const usbDevice: FoundDevice = {
  deviceDescriptor: {
    kind: 'usb',
    vendorId: 0x2c_97,
    productId: 0x10_01,
    serialNumber: 'serial-1',
  },
  displayName: 'Ledger Nano S',
  icon: 'UsbMemory',
};

describe('hw-connector mobile slice', () => {
  describe('Idle state transitions', () => {
    it('transitions Idle -> Searching on connectionRequested', () => {
      expect(reducer(idleState, actions.connectionRequested())).toEqual(
        searchingState,
      );
    });
  });

  describe('Searching state transitions', () => {
    it('updates devices on devicesChanged', () => {
      expect(
        reducer(
          searchingState,
          actions.devicesChanged({ devices: [bleDevice] }),
        ),
      ).toEqual({
        status: 'Searching',
        devices: [bleDevice],
      });
    });

    it('replaces devices on subsequent devicesChanged', () => {
      const withOne: HwConnectorMobileState = {
        status: 'Searching',
        devices: [bleDevice],
      };
      expect(
        reducer(withOne, actions.devicesChanged({ devices: [usbDevice] })),
      ).toEqual({
        status: 'Searching',
        devices: [usbDevice],
      });
    });

    it('transitions Searching -> Error on errored', () => {
      const errorTranslationKey =
        'v2.hardware-wallet.error.search-failed' as TranslationKey;
      expect(
        reducer(searchingState, actions.errored({ errorTranslationKey })),
      ).toEqual({
        status: 'Error',
        errorTranslationKey,
      });
    });

    it('transitions Searching -> Idle on deviceSelected', () => {
      expect(
        reducer(
          searchingState,
          actions.deviceSelected({ device: bleDevice.deviceDescriptor }),
        ),
      ).toEqual(idleState);
    });

    it('transitions Searching -> Idle on cancel', () => {
      expect(reducer(searchingState, actions.cancel())).toEqual(idleState);
    });
  });

  describe('Error state transitions', () => {
    const errorState: HwConnectorMobileState = {
      status: 'Error',
      errorTranslationKey:
        'v2.hardware-wallet.error.search-failed' as TranslationKey,
    };

    it('transitions Error -> Searching on retry', () => {
      expect(reducer(errorState, actions.retry())).toEqual(searchingState);
    });

    it('transitions Error -> Idle on cancel', () => {
      expect(reducer(errorState, actions.cancel())).toEqual(idleState);
    });
  });

  describe('selectState', () => {
    it('returns the slice state unchanged', () => {
      expect(
        hwConnectorMobileSelectors.hwConnectorMobile.selectState({
          'hw-connector-mobile': searchingState,
        }),
      ).toEqual(searchingState);
    });
  });
});
