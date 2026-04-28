import {
  isValidMidnightAddress,
  MidnightNetworkId,
} from '@lace-contract/midnight-context';
import { Err, None, Ok, Some } from '@lace-sdk/util';

import type { AddressBookAddressValidator } from '@lace-contract/address-book';
import type { MidnightSDKNetworkId } from '@lace-contract/midnight-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Option, Result } from '@lace-sdk/util';

const invalidAddressError = new Error('Invalid Midnight Address');
const unknownNetworkError = new Error(
  'Address validator could not determine Cardano network type',
);

const getMidnightNetworkId = (
  network: BlockchainNetworkId,
): Result<MidnightSDKNetworkId, Error> => {
  const networkId = MidnightNetworkId.getNetworkNameId(network);
  return networkId ? Ok(networkId) : Err(unknownNetworkError);
};

const validateAddress = ({
  address,
  network,
}: {
  address: string;
  network: BlockchainNetworkId;
}): Option<Error> => {
  const networkIdResult = getMidnightNetworkId(network);
  if (networkIdResult.isErr()) return Some(networkIdResult.unwrapErr());
  return isValidMidnightAddress(address, networkIdResult.unwrap())
    ? None
    : Some(invalidAddressError);
};

export const createAddressBookAddressValidator =
  (): AddressBookAddressValidator => ({
    blockchainName: 'Midnight',
    validateAddress,
  });

export default createAddressBookAddressValidator;
