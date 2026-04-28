/**
 * Display information for an address including ownership status and name.
 */
export interface AddressDisplayInfo {
  /** Whether the address belongs to the user's wallet */
  isOwn: boolean;
  /** Display name from address book, if available */
  displayName?: string;
}

/**
 * Determines whether the given address belongs to the user's wallet.
 *
 * @param address - The address string to check
 * @param ownAddresses - Array of addresses owned by the user's wallet
 * @returns True if the address is found in the ownAddresses array
 */
export const isOwnAddress = (
  address: string,
  ownAddresses: string[],
): boolean => {
  return ownAddresses.includes(address);
};

/**
 * Gets comprehensive display information for an address.
 *
 * This function determines:
 * 1. Whether the address belongs to the user's wallet (own vs foreign)
 * 2. The display name from the address book if available
 *
 * @param address - The address string to get information for
 * @param ownAddresses - Array of addresses owned by the user's wallet
 * @param addressToNameMap - Optional map of addresses to contact names from the address book
 * @returns Object containing ownership status and optional display name
 */
export const getAddressDisplayInfo = (
  address: string,
  ownAddresses: string[],
  addressToNameMap?: Map<string, string>,
): AddressDisplayInfo => {
  return {
    isOwn: isOwnAddress(address, ownAddresses),
    displayName: addressToNameMap?.get(address),
  };
};
