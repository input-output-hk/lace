import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';
import { Err, None, Ok, Some } from '@lace-sdk/util';

import { AddressValidationResult, validateBitcoinAddress } from './common';

import type { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Option, Result } from '@lace-sdk/util';

/**
 * Returns a human-readable error message based on the address validation result.
 * @param result The result of the address validation.
 */
const getErrorMessage = (
  result: Exclude<AddressValidationResult, AddressValidationResult.Valid>,
) => {
  switch (result) {
    case AddressValidationResult.InvalidAddress:
      return 'Invalid Bitcoin address format';
    case AddressValidationResult.InvalidNetwork:
      return 'Bitcoin address does not match the expected network';
    case AddressValidationResult.UnknownNetwork:
      return 'Bitcoin validator could not determine the network context';
    default:
      return 'Unknown error';
  }
};

const getBitcoinNetwork = (
  network: BlockchainNetworkId,
): Result<BitcoinNetwork, AddressValidationResult.UnknownNetwork> => {
  const bitcoinNetwork = BitcoinNetworkId.getBitcoinNetwork(network);
  if (!bitcoinNetwork) return Err(AddressValidationResult.UnknownNetwork);
  return Ok(bitcoinNetwork);
};

export const validateAddress = ({
  address,
  network,
}: {
  address: string;
  network: BlockchainNetworkId;
}): Option<Error> => {
  const result = getBitcoinNetwork(network).map(bitcoinNetwork => {
    return validateBitcoinAddress(address, bitcoinNetwork);
  });
  const validationResult = result.isOk() ? result.unwrap() : result.unwrapErr();

  return validationResult === AddressValidationResult.Valid
    ? None
    : Some(new Error(getErrorMessage(validationResult)));
};
