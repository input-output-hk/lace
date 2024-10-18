/* eslint-disable functional/no-throw-statements */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable max-params */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/naming-convention */
import { Serialization } from '@cardano-sdk/core';
import { minAdaRequired as minAdaRequiredSDK } from '@cardano-sdk/tx-construction';
import { crc8 } from 'crc';

import { CurrencyCode } from '../adapters/currency';
import provider from '../config/provider';

/**
 *
 * @param {string} currency - eg. usd
 * @returns
 */
export const currencyToSymbol = (currency: CurrencyCode) => {
  const currencyMap = {
    [CurrencyCode.USD]: '$',
    [CurrencyCode.EUR]: '€',
  };
  return currencyMap[currency];
};

/** Cardano metadata properties can hold a max of 64 bytes. The alternative is to use an array of strings. */
export const convertMetadataPropToString = (
  src: Readonly<any[] | string | undefined>,
) => {
  if (typeof src === 'string') return src;
  else if (Array.isArray(src)) return src.join('');
  return null;
};

export const linkToSrc = (link: string, base64 = false) => {
  const base64regex =
    /^([\d+/A-Za-z]{4})*(([\d+/A-Za-z]{2}==)|([\d+/A-Za-z]{3}=))?$/;
  if (link.startsWith('https://')) return link;
  else if (link.startsWith('ipfs://'))
    return (
      provider.api.ipfs +
      '/' +
      link.split('ipfs://')[1].split('ipfs/').slice(-1)[0]
    );
  else if (
    (link.startsWith('Qm') && link.length === 46) ||
    (link.startsWith('baf') && link.length === 59)
  ) {
    return provider.api.ipfs + '/' + link;
  } else if (base64 && base64regex.test(link))
    return 'data:image/png;base64,' + link;
  else if (link.startsWith('data:image')) return link;
  return undefined;
};

export const assetsToValue = (assets: readonly any[]) => {
  const tokenMap = new Map();
  const lovelace = assets.find(
    (asset: Readonly<{ unit: string }>) => asset.unit === 'lovelace',
  );
  const policies = [
    ...new Set(
      assets
        .filter(
          (asset: Readonly<{ unit: string }>) => asset.unit !== 'lovelace',
        )
        .map((asset: Readonly<{ unit: any[] | string }>) =>
          asset.unit.slice(0, 56),
        ),
    ),
  ];
  for (const policy of policies) {
    const policyAssets = assets.filter(
      (asset: Readonly<{ unit: any[] | string }>) =>
        asset.unit.slice(0, 56) === policy,
    );
    for (const asset of policyAssets) {
      if (tokenMap.has(asset.unit)) {
        const quantity = tokenMap.get(asset.unit);
        tokenMap.set(asset.unit, BigInt(asset.quantity) + quantity);
      } else {
        tokenMap.set(asset.unit, BigInt(asset.quantity));
      }
    }
  }
  const value = new Serialization.Value(
    BigInt(lovelace ? lovelace.quantity : '0'),
  );
  if (assets.length > 1 || !lovelace) value.setMultiasset(tokenMap);
  return value;
};

export const minAdaRequired = (
  output: Serialization.TransactionOutput,
  coinsPerUtxoWord: bigint,
) => {
  return minAdaRequiredSDK(output.toCore(), coinsPerUtxoWord).toString();
};

const checksum = (num: string) =>
  crc8(Buffer.from(num, 'hex')).toString(16).padStart(2, '0');

export const fromLabel = (label: Readonly<string>) => {
  if (label.length !== 8 || !(label.startsWith('0') && label[7] === '0')) {
    return null;
  }
  const numHex = label.slice(1, 5);
  const num = Number.parseInt(numHex, 16);
  const check = label.slice(5, 7);
  return check === checksum(numHex) ? num : null;
};

export const fromAssetUnit = (unit: Readonly<string>) => {
  const policyId = unit.slice(0, 56);
  const label = fromLabel(unit.slice(56, 64));
  const name = (() => {
    const hexName = Number.isInteger(label) ? unit.slice(64) : unit.slice(56);
    return unit.length === 56 ? '' : hexName || '';
  })();
  return { policyId, name, label };
};
