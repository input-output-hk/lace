// Typed method wrappers over the shared `window.lace` request client
// (@lace-lib/extension-shell-client). This module only needs the four
// host-owned Bitcoin methods — getUtxos / submitTx / requestSignTx /
// getSignTxResult (ADR 46); Bitcoin accounts are resolved from wallet-repo
// state (the cardano-host-pull hydrator already projects them), so no
// wallets.list leg is carried here.

import { request } from '@lace-lib/extension-shell-client';

import type { LaceMethodParams } from '@lace-lib/extension-shell-api';

type BitcoinNetworkName = LaceMethodParams<'bitcoin.getUtxos'>['network'];

export const getBitcoinUtxos = async (
  walletId: string,
  accountIndex: number,
  network: BitcoinNetworkName,
) => request('bitcoin.getUtxos', { walletId, accountIndex, network });
export const submitBitcoinTx = async (
  rawTxHex: string,
  network: BitcoinNetworkName,
) => request('bitcoin.submitTx', { rawTxHex, network });
export const requestSignBitcoinTx = async (
  params: LaceMethodParams<'bitcoin.requestSignTx'>,
) => request('bitcoin.requestSignTx', params);
export const getBitcoinSignTxResult = async (ceremonyId: string) =>
  request('bitcoin.getSignTxResult', { ceremonyId });
