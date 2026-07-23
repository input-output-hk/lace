import { Buffer } from 'buffer';

import {
  CryptoMultiAccounts,
  KeyDerivation,
  QRHardwareCall,
  QRHardwareCallType,
} from '@keystonehq/bc-ur-registry';
import {
  CardanoSignDataRequest,
  CardanoSignRequest,
  CardanoSignTxHashRequest,
  CardanoSignature,
} from '@keystonehq/bc-ur-registry-cardano';
import { URType } from '@keystonehq/keystone-sdk';
import { describe, expect, it } from 'vitest';

import { KeystoneUrType } from '../src/ur-types';

describe('KeystoneUrType', () => {
  it('matches the registry types of the base registry items', () => {
    const call = new QRHardwareCall(
      QRHardwareCallType.KeyDerivation,
      new KeyDerivation([]),
    );
    expect(call.getRegistryType().getType()).toBe(
      KeystoneUrType.AccountRequest,
    );
    const multiAccounts = new CryptoMultiAccounts(
      Buffer.from('01020304', 'hex'),
      [],
    );
    expect(multiAccounts.getRegistryType().getType()).toBe(
      KeystoneUrType.AccountResponse,
    );
  });

  it('matches the registry types of the Cardano registry items', () => {
    const txRequest = new CardanoSignRequest({
      signData: Buffer.alloc(1),
      utxos: [],
      extraSigners: [],
    });
    expect(txRequest.getRegistryType().getType()).toBe(
      KeystoneUrType.TxSignRequest,
    );
    const txResponse = new CardanoSignature(Buffer.alloc(1));
    expect(txResponse.getRegistryType().getType()).toBe(
      KeystoneUrType.TxSignResponse,
    );
    const dataRequest = CardanoSignDataRequest.constructCardanoSignDataRequest(
      '00',
      "m/1852'/1815'/0'/0/0",
      '01020304',
      'ab'.repeat(64),
    );
    expect(dataRequest.getRegistryType().getType()).toBe(
      KeystoneUrType.DataSignRequest,
    );
    const txHashRequest =
      CardanoSignTxHashRequest.constructCardanoSignTxHashRequest(
        '01'.repeat(32),
        [],
        [],
      );
    expect(txHashRequest.getRegistryType().getType()).toBe(
      KeystoneUrType.TxHashSignRequest,
    );
  });

  it('matches the wire types the official SDK routes responses by', () => {
    expect(KeystoneUrType.AccountResponse).toBe(URType.CryptoMultiAccounts);
    expect(KeystoneUrType.TxSignResponse).toBe(URType.CardanoSignature);
    expect(KeystoneUrType.DataSignResponse).toBe(
      URType.CardanoSignDataSignature,
    );
  });
});
