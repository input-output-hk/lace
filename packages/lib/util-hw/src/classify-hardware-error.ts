export type HardwareErrorCategory =
  | 'app-not-open'
  | 'device-disconnected'
  | 'device-locked'
  | 'device-picker-rejected'
  | 'generic'
  | 'not-supported'
  | 'unauthorized';

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
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'device-picker-rejected';
  }

  const { message, names } = collectChainInfo(error);

  // Ledger: "Cannot communicate with Ledger Cardano App"
  // with "General error 0x5515" = device locked, "General error 0x6e01" = app not open
  if (message.includes('cardano app')) {
    if (message.includes('0x5515')) return 'device-locked';
    return 'app-not-open';
  }

  if (names.has('NotImplementedError')) {
    return 'not-supported';
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
