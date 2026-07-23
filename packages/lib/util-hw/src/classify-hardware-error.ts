import { WRONG_DEVICE_CODE } from './seed-signer-errors';

/**
 * Mirrors of the bitcoin-air-gapped-protocol error codes, kept as literals:
 * util-hw ships in the SDK bundle, and importing the protocol lib would drag
 * its UR transport (and bc-ur) into the bundle for two string constants. The
 * classify-hardware-error tests import the real error classes and fail if
 * these drift from the protocol lib's codes.
 */
const WRONG_SCRIPT_TYPE_CODE = 'SEED_SIGNER_WRONG_SCRIPT_TYPE';
const MULTISIG_NOT_SUPPORTED_CODE = 'SEED_SIGNER_MULTISIG_NOT_SUPPORTED';

/**
 * Ledger transport status codes, mirrored from @ledgerhq/errors StatusCodes
 * as literals for the same bundle-size reason as above. LOCKED_DEVICE fires
 * regardless of which app the request targeted; the CLA/INS codes mean a
 * different app (or the dashboard) answered, i.e. the expected app is not
 * open. TransportStatusError puts the hex code in its message, e.g.
 * "Ledger device: CLA_NOT_SUPPORTED (0x6e00)".
 */
const LOCKED_DEVICE_STATUS = '0x5515';
const WRONG_APP_STATUS_CODES = ['0x6e00', '0x6e01', '0x6d00'];
const SILENT_EXPORT_REFUSED_STATUS = '0x6a82';

export type HardwareErrorCategory =
  | 'already-added'
  | 'app-not-open'
  | 'cancelled'
  | 'device-disconnected'
  | 'device-locked'
  | 'device-picker-rejected'
  | 'generic'
  | 'multisig-not-supported'
  | 'not-supported'
  | 'unauthorized'
  | 'version-unsupported'
  | 'wrong-device'
  | 'wrong-network-app'
  | 'wrong-script-type';

/**
 * Collect error messages and error names from the full error chain.
 * SDK errors (AuthenticationError, TransportError) use `innerError`
 * to wrap the original cause.  Trezor Connect payloads at the tail
 * of the chain are plain objects with `.error` / `.code` strings —
 * we keep following `innerError` past Error instances to capture those.
 */
const collectChainInfo = (
  error: unknown,
): { message: string; names: Set<string> } => {
  const messages: string[] = [];
  const names = new Set<string>();
  let current: unknown = error;
  while (current instanceof Error) {
    messages.push(current.message);
    if (current.name) names.add(current.name);
    names.add(current.constructor.name);
    current = (current as { innerError?: unknown }).innerError;
  }
  // Capture Trezor Connect payload (plain object with .error/.code)
  if (current != null && typeof current === 'object') {
    const payload = current as Record<string, unknown>;
    if (typeof payload.error === 'string') messages.push(payload.error);
    if (typeof payload.code === 'string') messages.push(payload.code);
  }
  return { message: messages.join(' ').toLowerCase(), names };
};

export const classifyHardwareError = (
  error: unknown,
): HardwareErrorCategory => {
  // WebUSB picker cancelled
  if (
    typeof DOMException !== 'undefined' &&
    error instanceof DOMException &&
    error.name === 'NotFoundError'
  ) {
    return 'device-picker-rejected';
  }

  const { message, names } = collectChainInfo(error);

  // Seed Signer Bitcoin export validation failures carry a stable code/name so
  // the specific message surfaces instead of the generic device-connection one.
  if (names.has(WRONG_SCRIPT_TYPE_CODE) || message.includes('wrong_script')) {
    return 'wrong-script-type';
  }
  if (
    names.has(MULTISIG_NOT_SUPPORTED_CODE) ||
    message.includes('multisig_not_supported')
  ) {
    return 'multisig-not-supported';
  }
  if (names.has(WRONG_DEVICE_CODE) || message.includes('wrong_device')) {
    return 'wrong-device';
  }

  // Mobile BLE discovery sheet dismissed by the user
  if (names.has('HwConnectionCancelledError')) {
    return 'device-picker-rejected';
  }

  // Mobile BLE search failed (BLE permissions denied, BT off, etc.)
  if (
    names.has('HwSearchFailedError') ||
    names.has('LedgerBlePermissionError')
  ) {
    return 'unauthorized';
  }

  // Ledger Cardano app version outside the supported range (too old, e.g.
  // below v2.2, or too new, e.g. v8.x)
  if (names.has('DeviceVersionUnsupported')) {
    return 'version-unsupported';
  }

  // Ledger locked device: @ledgerhq/errors raises LockedDeviceError for
  // status 0x5515 no matter which app the request targeted, and the Cardano
  // app path surfaces the same code as "General error 0x5515" in its message
  if (
    names.has('LockedDeviceError') ||
    message.includes(LOCKED_DEVICE_STATUS)
  ) {
    return 'device-locked';
  }

  // Ledger: "Cannot communicate with Ledger Cardano App"
  // with "General error 0x6e01" = app not open
  if (message.includes('cardano app')) {
    return 'app-not-open';
  }

  // Ledger Bitcoin app path: the transport throws TransportStatusError with
  // the status code in the message; the wrong-app codes mean the expected app
  // is not open, and unrecognized codes keep falling through
  if (
    names.has('TransportStatusError') &&
    WRONG_APP_STATUS_CODES.some(code => message.includes(code))
  ) {
    return 'app-not-open';
  }

  // Ledger ships one Bitcoin app per network (Bitcoin, Bitcoin Test); the
  // open app refuses silent xpub export for the other network's coin type
  // with 0x6a82, so the user needs the app matching the selected network
  if (
    names.has('TransportStatusError') &&
    message.includes(SILENT_EXPORT_REFUSED_STATUS)
  ) {
    return 'wrong-network-app';
  }

  if (names.has('NotImplementedError')) {
    return 'not-supported';
  }

  // User dismissed the air-gapped QR exchange overlay in Lace: a local
  // cancel, not a device rejection, so it must not surface as unauthorized.
  if (names.has('AirGappedQrExchangeCancelledError')) {
    return 'cancelled';
  }

  // User rejected on device, or cancelled auth prompt
  // Trezor device: Failure_ActionCancelled / error: "Cancelled"
  // Trezor popup:  Method_PermissionsNotGranted / error: "Permissions not granted"
  // Ledger: code 28169, wrapped as AuthenticationError
  if (
    message.includes('cancelled') ||
    message.includes('cancel') ||
    message.includes('aborted') ||
    message.includes('rejected') ||
    message.includes('permissions not granted') ||
    names.has('AuthenticationCancelledError')
  ) {
    return 'unauthorized';
  }

  // AuthenticationError without cancellation keywords (e.g. passphrase failure)
  if (names.has('AuthenticationError')) {
    return 'unauthorized';
  }

  // TransportError anywhere in chain → device communication failure
  if (names.has('TransportError')) {
    return 'device-disconnected';
  }

  // Fallback message-based classification
  if (
    message.includes('disconnected') ||
    message.includes('cannot communicate') ||
    message.includes('transport failed') ||
    message.includes('pre-authorized usb device not found')
  ) {
    return 'device-disconnected';
  }

  return 'generic';
};
