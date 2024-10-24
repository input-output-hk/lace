export const NODE = {
  mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0',
  testnet: 'https://cardano-testnet.blockfrost.io/api/v0',
  preview: 'https://cardano-preview.blockfrost.io/api/v0',
  preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
};

export const POPUP = {
  main: 'mainPopup',
  internal: 'internalPopup',
};

export const TAB = {
  hw: 'hwTab',
  createWallet: 'createWalletTab',
  trezorTx: 'trezorTx',
};

export const HW = {
  trezor: 'trezor',
  ledger: 'ledger',
};

export const POPUP_WINDOW = {
  top: 50,
  left: 100,
  width: 400,
  height: 600,
};

export const ERROR = {
  accessDenied: 'Access denied',
  wrongPassword: 'Wrong password',
  passwordChangeNotPossible: 'Cannot change password',
  txTooBig: 'Transaction too big',
  txNotPossible: 'Transaction not possible',
  storeNotEmpty: 'Storage key is already set',
  onlyOneAccount: 'Only one account exist in the wallet',
  fullMempool: 'fullMempool',
  submit: 'submit',
};

export const TX = {
  invalid_hereafter: 3600 * 6, //6h from current slot
};

// Errors dApp Connector
export const APIError = {
  InvalidRequest: {
    code: -1,
    info: 'Inputs do not conform to this spec or are otherwise invalid.',
  },
  InternalError: {
    code: -2,
    info: 'An error occurred during execution of this API call.',
  },
  Refused: {
    code: -3,
    info: 'The request was refused due to lack of access - e.g. wallet disconnects.',
  },
  AccountChange: {
    code: -4,
    info: 'The account has changed. The dApp should call `wallet.enable()` to reestablish connection to the new account. The wallet should not ask for confirmation as the user was the one who initiated the account change in the first place.',
  },
};

export const TxSendError = {
  Refused: {
    code: 1,
    info: 'Wallet refuses to send the tx (could be rate limiting).',
  },
  Failure: { code: 2, info: 'Wallet could not send the tx.' },
};

export const TxSignError = {
  ProofGeneration: {
    code: 1,
    info: 'User has accepted the transaction sign, but the wallet was unable to sign the transaction (e.g. not having some of the private keys).',
  },
  UserDeclined: { code: 2, info: 'User declined to sign the transaction.' },
};
