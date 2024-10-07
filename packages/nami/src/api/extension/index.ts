/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable unicorn/no-null */
// import { HARDENED } from '@cardano-foundation/ledgerjs-hw-app-cardano';
import {
  Cardano,
  ProviderError,
  ProviderFailure,
  Serialization,
  type HandleProvider,
} from '@cardano-sdk/core';
import { createAvatar } from '@dicebear/avatars';
import * as style from '@dicebear/avatars-bottts-sprites';
// import TrezorConnect from '@trezor/connect-web';

import {
  APIError,
  HW,
  TxSendError,
  // TxSignError
} from '../../config/config';

import type { Wallet } from '@lace/cardano';

// import { Loader } from '../loader';
// import { txToLedger, txToTrezor } from '../util';

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

export const signTxHW = async () =>
  // tx,
  // keyHashes,
  // account,
  // hw,
  // partialSign = false,
  {
    return null;
    // const rawTx = Loader.Cardano.Transaction.from_bytes(Buffer.from(tx, 'hex'));
    // const address = Cardano.Address.fromBech32(account.paymentAddr);
    // const network = address.getNetworkId();
    // const keys = {
    //   payment: { hash: null, path: null },
    //   stake: { hash: null, path: null },
    // };
    // if (hw.device === HW.ledger) {
    //   const appAda = hw.appAda;
    //   for (const keyHash of keyHashes) {
    //     if (keyHash === account.paymentKeyHash)
    //       keys.payment = {
    //         hash: keyHash,
    //         path: [
    //           HARDENED + 1852,
    //           HARDENED + 1815,
    //           HARDENED + (hw.account as number),
    //           0,
    //           0,
    //         ],
    //       };
    //     else if (keyHash === account.stakeKeyHash)
    //       keys.stake = {
    //         hash: keyHash,
    //         path: [
    //           HARDENED + 1852,
    //           HARDENED + 1815,
    //           HARDENED + (hw.account as number),
    //           2,
    //           0,
    //         ],
    //       };
    //     else if (partialSign) {
    //       continue;
    //     } else {
    //       throw TxSignError.ProofGeneration;
    //     }
    //   }
    //   const ledgerTx = await txToLedger(
    //     rawTx,
    //     network,
    //     keys,
    //     Buffer.from(address.toBytes()).toString('hex'),
    //     hw.account,
    //   );
    //   const result = await appAda.signTransaction(ledgerTx);
    //   // getting public keys
    //   const witnessSet = Loader.Cardano.TransactionWitnessSet.new();
    //   const vkeys = Loader.Cardano.Vkeywitnesses.new();
    //   for (const witness of result.witnesses) {
    //     if (
    //       witness.path[3] == 0 // payment key
    //     ) {
    //       const vkey = Loader.Cardano.Vkey.new(
    //         Loader.Cardano.Bip32PublicKey.from_bytes(
    //           Buffer.from(account.publicKey, 'hex'),
    //         )
    //           .derive(0)
    //           .derive(0)
    //           .to_raw_key(),
    //       );
    //       const signature = Loader.Cardano.Ed25519Signature.from_hex(
    //         witness.witnessSignatureHex,
    //       );
    //       vkeys.add(Loader.Cardano.Vkeywitness.new(vkey, signature));
    //     } else if (
    //       witness.path[3] == 2 // stake key
    //     ) {
    //       const vkey = Loader.Cardano.Vkey.new(
    //         Loader.Cardano.Bip32PublicKey.from_bytes(
    //           Buffer.from(account.publicKey, 'hex'),
    //         )
    //           .derive(2)
    //           .derive(0)
    //           .to_raw_key(),
    //       );
    //       const signature = Loader.Cardano.Ed25519Signature.from_hex(
    //         witness.witnessSignatureHex,
    //       );
    //       vkeys.add(Loader.Cardano.Vkeywitness.new(vkey, signature));
    //     }
    //   }
    //   witnessSet.set_vkeys(vkeys);
    //   return witnessSet;
    // } else {
    //   for (const keyHash of keyHashes) {
    //     if (keyHash === account.paymentKeyHash)
    //       keys.payment = {
    //         hash: keyHash,
    //         path: `m/1852'/1815'/${hw.account}'/0/0`,
    //       };
    //     else if (keyHash === account.stakeKeyHash)
    //       keys.stake = {
    //         hash: keyHash,
    //         path: `m/1852'/1815'/${hw.account}'/2/0`,
    //       };
    //     else if (partialSign) {
    //       continue;
    //     } else {
    //       throw TxSignError.ProofGeneration;
    //     }
    //   }
    //   const trezorTx = await txToTrezor(
    //     rawTx,
    //     network,
    //     keys,
    //     Buffer.from(address.toBytes()).toString('hex'),
    //     hw.account,
    //   );
    //   const result = await TrezorConnect.cardanoSignTransaction(trezorTx);
    //   if (!result.success) throw new Error('Trezor could not sign tx');
    //   // getting public keys
    //   const witnessSet = Loader.Cardano.TransactionWitnessSet.new();
    //   const vkeys = Loader.Cardano.Vkeywitnesses.new();
    //   for (const witness of result.payload.witnesses) {
    //     const vkey = Loader.Cardano.Vkey.new(
    //       Loader.Cardano.PublicKey.from_bytes(Buffer.from(witness.pubKey, 'hex')),
    //     );
    //     const signature = Loader.Cardano.Ed25519Signature.from_hex(
    //       witness.signature,
    //     );
    //     vkeys.add(Loader.Cardano.Vkeywitness.new(vkey, signature));
    //   }
    //   witnessSet.set_vkeys(vkeys);
    //   return witnessSet;
    // }
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

export const indexToHw = (accountIndex: string) => ({
  device: accountIndex.split('-')[0],
  id: accountIndex.split('-')[1],
  account: Number.parseInt(accountIndex.split('-')[2]),
});

export const isHW = (accountIndex: number | string | undefined) =>
  accountIndex != undefined &&
  accountIndex != 0 &&
  typeof accountIndex !== 'number' &&
  (accountIndex.startsWith(HW.trezor) || accountIndex.startsWith(HW.ledger));

export const initHW = async () =>
  // { device, id }
  {
    return await Promise.resolve({});
    // if (device == HW.ledger) {
    //   const foundDevice = await new Promise((res, rej) =>
    //     navigator.usb
    //       .getDevices()
    //       .then((devices) =>
    //         res(
    //           devices.find(
    //             (device) =>
    //               device.productId == id && device.manufacturerName === 'Ledger'
    //           )
    //         )
    //       )
    //   );
    //   const transport = await TransportWebUSB.open(foundDevice);
    //   const appAda = new Ada(transport);
    //   await appAda.getVersion(); // check if Ledger has Cardano app opened
    //   return appAda;
    // } else if (device == HW.trezor) {
    //   try {
    //     await TrezorConnect.init({
    //       manifest: {
    //         email: 'namiwallet.cardano@gmail.com',
    //         appUrl: 'http://namiwallet.io',
    //       },
    //     });
    //   } catch (e) {}
    // }
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
