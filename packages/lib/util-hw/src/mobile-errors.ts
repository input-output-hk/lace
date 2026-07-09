/**
 * BLE-scanner error types lifted out of `mobile/ledger-ble-service.ts` so
 * non-mobile call sites (and tests) can pattern-match on them without
 * pulling react-native dependencies in.
 */

export class LedgerBlePermissionError extends Error {
  public constructor() {
    super('Bluetooth permissions are required to scan for Ledger devices');
    this.name = 'LedgerBlePermissionError';
  }
}

export class BluetoothOffError extends Error {
  public constructor() {
    super('Bluetooth is turned off');
    this.name = 'BluetoothOffError';
  }
}
