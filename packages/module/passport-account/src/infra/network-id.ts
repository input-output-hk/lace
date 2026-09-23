/**
 * Applies the Midnight network id the rest of the Midnight libraries read
 * from module-global state. Address formats and transaction binding depend
 * on it, and every wallet or contract operation throws until it is set, so
 * each entry point into a chain flow applies it before doing any work.
 * Setting the same id again is harmless; a different id replaces the
 * previous one, which is why one network config owns the value.
 */
export const applyNetworkId = async (networkId: string): Promise<void> => {
  const { setNetworkId } = await import(
    '@midnight-ntwrk/midnight-js-network-id'
  );
  setNetworkId(networkId);
};
