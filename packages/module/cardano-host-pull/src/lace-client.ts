// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module only needs the host-owned
// data subset — params/utxos/addresses/submit — plus wallets.list for the
// wallet-id resolver.

import { request } from '@lace-lib/extension-shell-client';

export const listWallets = async () => request('wallets.list');
export const getCardanoParams = async (networkMagic: number) =>
  request('cardano.getParams', { networkMagic });
export const getCardanoUtxos = async (
  walletId: string,
  accountIndex: number,
  networkMagic: number,
) => request('cardano.getUtxos', { walletId, accountIndex, networkMagic });
/** `forceRediscover` is the user-triggered thorough discovery: the host drops
 * its persisted gap walk for the account and re-walks. Default-off — every
 * automatic read stays a cached host read. */
export const getCardanoAddresses = async ({
  walletId,
  accountIndex,
  networkMagic,
  forceRediscover = false,
}: {
  walletId: string;
  accountIndex: number;
  networkMagic: number;
  forceRediscover?: boolean;
}) =>
  request('cardano.getAddresses', {
    walletId,
    accountIndex,
    networkMagic,
    forceRediscover,
  });
export const submitCardanoTx = async (txCbor: string, networkMagic: number) =>
  request('cardano.submitTx', { txCbor, networkMagic });
/** The account's live pending-tx entries from the host overlay — the txs
 * in flight for it, including any a dapp submitted without the guest. */
export const getPendingCardanoTxs = async (
  walletId: string,
  accountIndex: number,
  networkMagic: number,
) => request('cardano.getPendingTxs', { walletId, accountIndex, networkMagic });
export const requestSignCardanoTx = async (accountId: string, txCbor: string) =>
  request('cardano.requestSignTx', { accountId, txCbor });
export const getCardanoSignTxResult = async (ceremonyId: string) =>
  request('cardano.getSignTxResult', { ceremonyId });
/** Record the guest's active Cardano network with the host (ADR 41
 * lace.settings) so the host validates dapp grants against it. */
export const setActiveCardanoNetwork = async (networkMagic: number) =>
  request('settings.setActiveNetwork', {
    blockchain: 'Cardano',
    networkMagic,
  });
