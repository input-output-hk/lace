const stages = [
  'transaction inspection',
  'signing preparation',
  'signer setup',
  'signing',
  'witness assembly',
] as const;

export type SignTxErrorStage = (typeof stages)[number];

export interface SanitisedSignTxError {
  stage: SignTxErrorStage;
  name: string;
  message: string;
  code?: number;
  reason?: string;
  cause?: SanitisedSignTxError;
}

const names = [
  'Error',
  'TypeError',
  'RangeError',
  'APIError',
  'TxSignError',
  'AuthenticationError',
  'ProofGenerationError',
  'VkeyWitnessConflictError',
  'TransportError',
  'ProviderError',
  'SerializationError',
  'InvalidArgumentError',
  'InvalidStateError',
  'InvalidStringError',
  'CborContentException',
  'CborInvalidOperationException',
  'LossOfPrecisionException',
];

const messages = [
  'No transaction data provided',
  'Failed to parse transaction',
  'Unexpected end of buffer',
  'Definite length exceeds buffer size',
  'Key missing value',
  'Not a boolean encoding',
  'Not a null encoding',
  'Not a float encoding',
  'Not a simple value encoding',
  'Not indefinite length string',
  'Expected definite length array and got indefinite length',
  'Expected definite length string and got indefinite length',
  'No more data items to read',
  'End of root-level. No more data items to read',
  'Indefinite length string contains invalid data item',
  'Not at end of indefinite length data item',
  'Not at end of definite length data item',
  'Tag not followed by value',
  'Buffer offset out of bounds',
  'Unexpected break byte',
  'Invalid CBOR major type.',
  'Invalid CBOR major type pushed to stack.',
  'Integer overflow',
  'Invalid integer encoding',
  'Invalid string: "expected hex string"',
  'Cannot sign transaction: chain ID is undefined',
  'signTx is only supported for single-sig Cardano accounts',
  'The wallet does not have the secret key associated with some of the inputs or certificates.',
  'The wallet does not have the secret key associated with any of the inputs and certificates.',
  'Wallet is missing Cardano encrypted root private key',
  'Authentication failure: Failed to enter passphrase',
  'Authentication failure: Failed to decrypt root private key',
  'Proof generation failure',
  'Transaction signing failed',
  'Pre-validation failed',
  'Wallet UTxOs not ready; retry once the wallet has synced',
  'Wallet not found or signing not supported for this account',
  'Chain ID is undefined',
  'The transaction could not be decoded.',
  'Failed to fetch',
  'fetch failed',
];

// These templates retain the failure, never the account, origin, key or payload.
const templates: [RegExp, string][] = [
  [
    /^No account found for origin: /,
    'No account found for origin: [redacted]. Please reconnect the dApp.',
  ],
  [/^Account not found for ID: /, 'Account not found for ID: [redacted]'],
  [
    /^Account not found for origin: /,
    'Account not found for origin: [redacted]',
  ],
  [
    /^Account is not a Cardano account: /,
    'Account is not a Cardano account: [redacted]',
  ],
  [
    /^signTx is not supported for MultiSig accounts: /,
    'signTx is not supported for MultiSig accounts: [redacted]',
  ],
  [/^Wallet not found for ID: /, 'Wallet not found for ID: [redacted]'],
  [
    /^Account .+ not found in wallet$/,
    'Account [redacted] not found in wallet',
  ],
  [
    /^Account .+ is not a Cardano account$/,
    'Account [redacted] is not a Cardano account',
  ],
  [
    /^No signer factory registered for account type /,
    'No signer factory registered for account type [redacted]',
  ],
  [
    /^CardanoInMemorySignerFactory does not support account type: /,
    'CardanoInMemorySignerFactory does not support account type: [redacted]',
  ],
  [
    /^Conflicting vkey witnesses for public key /,
    'Conflicting vkey witnesses for public key [redacted]',
  ],
  [
    /^Invalid argument 'cbor': Expected an array of /,
    "Invalid argument 'cbor': Expected an array of [redacted] elements, but got an array of [redacted] elements",
  ],
];

// CBOR major types are a finite public enum, not transaction-derived free text.
const cborTypes = ['0', '1', '2', '3', '4', '5', '6', '7'];
const cborMessages = cborTypes.flatMap(expected =>
  cborTypes.flatMap(actual => [
    `Major type mismatch, expected type ${expected} but got ${actual}`,
    `Reader type mismatch, expected ${expected} but got ${actual}`,
    `Pop major type mismatch, expected ${expected} but got ${actual}`,
  ]),
);
const networkMessages = ['mainnet', 'preprod', 'preview'].flatMap(network => [
  `The transaction does not state which network it is for, and this account is on ${network}.`,
  `Part of the transaction could not be read, so the wallet cannot confirm it belongs to ${network}.`,
  ...['mainnet', 'a testnet', 'a different network'].map(
    target =>
      `The transaction targets ${target}, but this account is on ${network}.`,
  ),
]);
const reasons = [
  'CONFLICT',
  'NOT_FOUND',
  'UNKNOWN',
  'FORBIDDEN',
  'INVALID_RESPONSE',
  'NOT_IMPLEMENTED',
  'UNHEALTHY',
  'CONNECTION_FAILURE',
  'BAD_REQUEST',
  'SERVER_UNAVAILABLE',
  'INVALID_TYPE',
  'OVERFLOW',
  'INVALID_ADDRESS',
  'MAX_LENGTH_LIMIT',
  'INVALID_SCRIPT',
  'INVALID_NATIVE_SCRIPT_KIND',
  'INVALID_SCRIPT_TYPE',
  'INVALID_DATUM',
  'UNKNOWN_FIELD',
];
const accountMessages = [
  'InMemory',
  'Ledger',
  'Trezor',
  'Keystone',
  'SeedSigner',
  'MultiSig',
].flatMap(accountType => [
  `No signer factory registered for account type "${accountType}"`,
  `CardanoInMemorySignerFactory does not support account type: ${accountType}`,
]);

const field = (error: unknown, key: string): unknown => {
  try {
    return error !== null && typeof error === 'object'
      ? (error as Record<string, unknown>)[key]
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Produces serialisable diagnostics before an error crosses into UI state.
 * Every output string comes from this allowlist; free text and stacks never
 * pass through, including inside SDK innerError / standard cause chains.
 */
export const sanitiseSignTxError = (
  error: unknown,
  stage: SignTxErrorStage,
  depth = 0,
): SanitisedSignTxError => {
  const rawMessage =
    typeof error === 'string' ? error : field(error, 'message');
  const reasonWithDetail = reasons.find(
    reason =>
      typeof rawMessage === 'string' && rawMessage.startsWith(`${reason} (`),
  );
  const message =
    [
      ...messages,
      ...cborMessages,
      ...networkMessages,
      ...reasons,
      ...accountMessages,
    ].find(
      value =>
        value === rawMessage ||
        (typeof rawMessage === 'string' &&
          rawMessage.startsWith(`${value} due to\n `)),
    ) ??
    templates.find(
      ([pattern]) => typeof rawMessage === 'string' && pattern.test(rawMessage),
    )?.[1] ??
    (reasonWithDetail
      ? `${reasonWithDetail} ([redacted])`
      : '[Unrecognised message omitted for privacy]');
  const name = names.find(value => value === field(error, 'name')) ?? 'Error';
  const code = [-4, -3, -2, -1, 1, 2].find(
    value => value === field(error, 'code'),
  );
  const reason = reasons.find(value => value === field(error, 'reason'));
  const cause = field(error, 'cause') ?? field(error, 'innerError');
  const safeStage =
    stages.find(value => value === field(error, 'stage')) ??
    stages.find(value => value === stage) ??
    'signing';
  return {
    stage: safeStage,
    name,
    message,
    ...(reason && (name === 'ProviderError' || name === 'SerializationError')
      ? { reason }
      : {}),
    ...((name === 'APIError' || name === 'TxSignError') && code !== undefined
      ? { code }
      : {}),
    ...(cause != null && depth < 2
      ? { cause: sanitiseSignTxError(cause, safeStage, depth + 1) }
      : {}),
  };
};
