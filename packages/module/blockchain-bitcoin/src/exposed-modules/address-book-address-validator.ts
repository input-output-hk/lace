import { validateAddress } from '../validate-address';

import type { AddressBookAddressValidator } from '@lace-contract/address-book';

export const createAddressBookAddressValidator =
  (): AddressBookAddressValidator => ({
    blockchainName: 'Bitcoin',
    validateAddress,
  });

export default createAddressBookAddressValidator;
