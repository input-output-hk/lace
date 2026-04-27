import { Cardano } from '@cardano-sdk/core';
import { CardanoNetworkId } from '@lace-contract/cardano-context';
import { Err, None, Ok, Some } from '@lace-sdk/util';

import type { BlockchainNetworkId } from '@lace-contract/network';
import type { Option, Result } from '@lace-sdk/util';

export const invalidAddressError = new Error('Invalid Cardano Address');
export const unknownNetworkError = new Error(
  'Address validator could not determine Cardano network type',
);

const getCardanoNetworkId = (
  network: BlockchainNetworkId,
): Result<Cardano.NetworkId, Error> => {
  const chainId = CardanoNetworkId.getChainId(network);
  if (!chainId) return Err(unknownNetworkError);
  return Ok(
    chainId === Cardano.ChainIds.Mainnet
      ? Cardano.NetworkId.Mainnet
      : Cardano.NetworkId.Testnet,
  );
};

export const validateAddress = ({
  address,
  network,
}: {
  address: string;
  network: BlockchainNetworkId;
}): Option<Error> => {
  const cardanoNetworkIdResult = getCardanoNetworkId(network);
  if (cardanoNetworkIdResult.isErr())
    return Some(cardanoNetworkIdResult.unwrapErr());
  return Cardano.Address.isValid(address) &&
    Cardano.Address.fromString(address)?.getNetworkId() ===
      cardanoNetworkIdResult.unwrap()
    ? None
    : Some(invalidAddressError);
};
