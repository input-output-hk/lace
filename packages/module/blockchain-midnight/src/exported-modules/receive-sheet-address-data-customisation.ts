import {
  getAddressType,
  isInMemoryMidnightAccount,
} from '@lace-contract/midnight-context';
import { createUICustomisation } from '@lace-lib/util-render';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  ReceiveSheetAddressData,
  ReceiveSheetAddressDataCustomisation,
  ReceiveSheetAddressInfo,
} from '@lace-contract/app';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const MIDNIGHT_BLOCKCHAIN_NAME = 'Midnight';

type MidnightAddressKind = 'dust' | 'shielded' | 'unshielded';

const ADDRESS_KIND_TO_TRANSLATION_KEY: Record<
  MidnightAddressKind,
  TranslationKey
> = {
  dust: 'midnight.drawer.receive.dust-pill',
  shielded: 'midnight.drawer.receive.shielded-pill',
  unshielded: 'midnight.drawer.receive.unshielded-pill',
};

const DUST_ADDRESS_INFO_TRANSLATION_KEY: TranslationKey =
  'midnight.drawer.receive.dust-address-info';

export const getReceiveSheetAddressData = (
  selectedAccount: AnyAccount,
  addresses: AnyAddress[],
): ReceiveSheetAddressData => {
  if (!isInMemoryMidnightAccount(selectedAccount) || addresses.length === 0) {
    return undefined;
  }
  const networkId = selectedAccount.blockchainSpecific.networkId;

  return addresses
    .map(addr => {
      try {
        const kind = getAddressType(addr.address, networkId);
        return { key: ADDRESS_KIND_TO_TRANSLATION_KEY[kind], address: addr };
      } catch {
        return null;
      }
    })
    .filter(
      (entry): entry is { key: TranslationKey; address: AnyAddress } =>
        entry !== null,
    );
};

export const getReceiveSheetAddressInfo = (
  selectedAccount: AnyAccount,
): ReceiveSheetAddressInfo => {
  if (!isInMemoryMidnightAccount(selectedAccount)) {
    return undefined;
  }
  const networkId = selectedAccount.blockchainSpecific.networkId;
  return (address: AnyAddress) => {
    try {
      const kind = getAddressType(address.address, networkId);
      return kind === 'dust' ? DUST_ADDRESS_INFO_TRANSLATION_KEY : undefined;
    } catch {
      return undefined;
    }
  };
};

const receiveSheetAddressDataCustomisation =
  createUICustomisation<ReceiveSheetAddressDataCustomisation>({
    key: 'midnight',
    uiCustomisationSelector: (blockchainName: string) =>
      blockchainName === MIDNIGHT_BLOCKCHAIN_NAME,
    getReceiveSheetAddressData,
    getReceiveSheetAddressInfo,
  });

const loadReceiveSheetAddressDataCustomisation = () =>
  receiveSheetAddressDataCustomisation;

export default loadReceiveSheetAddressDataCustomisation;
