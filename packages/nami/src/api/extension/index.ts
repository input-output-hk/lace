/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable unicorn/no-null */
import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
  type HandleProvider,
} from '@cardano-sdk/core';
import { createAvatar } from '@dicebear/avatars';
import * as style from '@dicebear/avatars-bottts-sprites';

import { APIError, TxSendError } from '../../config/config';

import type { Wallet } from '@lace/cardano';

export const getFavoriteIcon = (domain: string) => {
  return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${domain}&size=32`;
};

export const createTab = async (tab: string, query = '') =>
  new Promise((res, rej) => {
    chrome.tabs.create(
      {
        url: chrome.runtime.getURL(`${tab}.html${query}`),
        active: true,
      },
      tab => {
        chrome.windows.create(
          {
            tabId: tab.id,
            focused: true,
          },
          () => {
            res(tab);
          },
        );
      },
    );
  });

export const isValidAddress = (
  address: string,
  currentChain: Readonly<Cardano.ChainId>,
) => {
  try {
    const addr = Cardano.Address.fromBech32(address);
    if (
      (addr.getNetworkId() === Cardano.NetworkId.Mainnet &&
        currentChain.networkMagic === Cardano.NetworkMagics.Mainnet) ||
      (addr.getNetworkId() === Cardano.NetworkId.Testnet &&
        (currentChain.networkMagic === Cardano.NetworkMagics.Preview ||
          currentChain.networkMagic === Cardano.NetworkMagics.Preprod))
    ) {
      return addr.toBytes();
    }
    return false;
  } catch {}
  try {
    const addr = Cardano.ByronAddress.fromAddress(
      Cardano.Address.fromBase58(address),
    )?.toAddress();
    if (
      (addr?.getNetworkId() === Cardano.NetworkId.Mainnet &&
        currentChain.networkMagic === Cardano.NetworkMagics.Mainnet) ||
      (addr?.getNetworkId() === Cardano.NetworkId.Testnet &&
        (currentChain.networkMagic === Cardano.NetworkMagics.Preview ||
          currentChain.networkMagic === Cardano.NetworkMagics.Preprod))
    )
      return addr.toBytes();
    return false;
  } catch {}
  return false;
};

// /**
//  *
//  * @param {string} tx - cbor hex string
//  * @returns
//  */
export const submitTx = async (
  tx: string,
  inMemoryWallet: Wallet.ObservableWallet,
): Promise<Cardano.TransactionId | undefined> => {
  try {
    const result = await inMemoryWallet.submitTx(Serialization.TxCBOR(tx));
    return result;
  } catch (error) {
    if (
      error instanceof ProviderError &&
      ProviderFailure.BadRequest === error.reason
    ) {
      throw { ...TxSendError.Failure, message: error.message };
    }
    throw APIError.InvalidRequest;
  }
};

export const initHW = async () => {
  return await Promise.resolve({});
};

// /**
//  *
//  * @param {string} assetName utf8 encoded
//  */
export const getAdaHandle = async (
  assetName: string,
  handleResolver: HandleProvider,
) => {
  try {
    if (!assetName) {
      return null;
    }
    const resolvedHandle = await handleResolver.resolveHandles({
      handles: [assetName],
    });

    return resolvedHandle[0]?.cardanoAddress ?? null;
  } catch {
    return null;
  }
};

export const avatarToImage = (avatar: string) => {
  const blob = new Blob(
    [
      createAvatar(style, {
        seed: avatar,
      }),
    ],
    { type: 'image/svg+xml' },
  );
  return URL.createObjectURL(blob);
};

export const displayUnit = (
  quantity: bigint | number | string,
  decimals = 6,
) => {
  if (quantity === undefined) return 0;

  return Number.parseInt(quantity.toString()) / 10 ** decimals;
};

export const toUnit = (amount: string, decimals = 6) => {
  if (!amount) return '0';
  let result = Number.parseFloat(
    amount.toString().replace(/[\s,]/g, ''),
  ).toLocaleString('en-EN', { minimumFractionDigits: decimals });
  const split = result.split('.');
  const front = split[0].replace(/[\s,]/g, '');
  result =
    (Number(front) == 0 ? '' : front) +
    (split[1] ? split[1].slice(0, decimals) : '');
  if (!result) return '0';
  else if (result == 'NaN') return '0';
  return result;
};
