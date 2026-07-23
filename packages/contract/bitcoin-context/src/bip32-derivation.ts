import { BitcoinNetwork } from './types';

/** BIP-32 purpose per Bitcoin address type name (BIP-44/49/84/86). */
const ADDRESS_TYPE_TO_PURPOSE: Record<string, number> = {
  Legacy: 44,
  SegWit: 49,
  NativeSegWit: 84,
  Taproot: 86,
};

const MAINNET: string = BitcoinNetwork.Mainnet;

/**
 * Builds the account-level BIP-32 derivation path
 * (m/purpose'/coin_type'/account') for the given address type, network and
 * account index. Throws on unknown address types: this path feeds key
 * derivation and signing key origins, so a silent default would derive for
 * the wrong scheme.
 */
export const bitcoinAccountDerivationPath = (props: {
  addressType: string;
  network: string;
  account: number;
}): string => {
  const purpose = ADDRESS_TYPE_TO_PURPOSE[props.addressType];
  if (purpose === undefined) {
    throw new Error(`Unknown Bitcoin address type: ${props.addressType}`);
  }
  const coinType = props.network === MAINNET ? 0 : 1;
  return `m/${purpose}'/${coinType}'/${props.account}'`;
};

/**
 * Builds the full BIP-32 derivation path
 * (m/purpose'/coin_type'/account'/chain/index) for a single address. The chain
 * segment is 1 for the internal (change) chain and 0 otherwise.
 */
export const bitcoinFullDerivationPath = (props: {
  addressType: string;
  network: string;
  account: number;
  chain: string;
  index: number;
}): string => {
  const chain = props.chain === 'internal' ? 1 : 0;
  return `${bitcoinAccountDerivationPath(props)}/${chain}/${props.index}`;
};
