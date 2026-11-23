import {
  groupMidnightConnectorInputs,
  groupMidnightConnectorOutputs,
} from '@lace-lib/vendor/midnight-connector-transaction';
import { readMidnightTransaction } from '@lace-lib/vendor/midnight-transaction-handle';
import * as v8 from '@midnightntwrk/ledger-v8';
import * as v9 from '@midnightntwrk/ledger-v9';
import { chooseCoin } from '@midnightntwrk/wallet-sdk/capabilities';
import * as s8 from '@midnightntwrk/wallet-sdk/shielded/v1';
import * as s9 from '@midnightntwrk/wallet-sdk/shielded/v2';
import * as u8 from '@midnightntwrk/wallet-sdk/unshielded/v1';
import * as u9 from '@midnightntwrk/wallet-sdk/unshielded/v2';
import {
  ProtocolVersion,
  WalletTransaction,
} from '@midnightntwrk/wallet-sdk-abstractions';
import {
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
  UnshieldedAddress,
} from '@midnightntwrk/wallet-sdk-address-format';
import { Either } from 'effect';
import { describe, expect, it } from 'vitest';

import { createFacadeHarness } from '../helpers/v2-facade';

import type {
  CombinedSwapInputs,
  TokenTransfer,
} from '@midnightntwrk/wallet-sdk/facade';

const supply = 10_000_000_000_000_000n;
const give = 9_007_199_254_740_993n;
const want = 23n;
const owner = v8.signatureVerifyingKey('01'.repeat(32));
const recipient = '02'.repeat(32);
const ttl = new Date('2030-01-01T00:00:00Z');

const seededV8 = () => {
  const keys = v8.ZswapSecretKeys.fromSeed(new Uint8Array(32).fill(1));
  const receiverKeys = v8.ZswapSecretKeys.fromSeed(new Uint8Array(32).fill(2));
  const coin = v8.createShieldedCoinInfo(v8.shieldedToken().raw, supply);
  const genesis = v8.ZswapOffer.fromOutput(
    v8.ZswapOutput.new(coin, 0, keys.coinPublicKey, keys.encryptionPublicKey),
    coin.type,
    coin.value,
  );
  let shieldedState = s8.CoreWallet.init(
    new v8.ZswapLocalState().apply(keys, genesis),
    keys,
    'undeployed',
  );
  let unshieldedState = Either.getOrThrow(
    u8.CoreWallet.applyUpdate(
      u8.CoreWallet.init(
        {
          publicKey: owner,
          addressHex: owner,
          address: '',
        },
        'undeployed',
      ),
      {
        status: 'SUCCESS',
        spentUtxos: [],
        createdUtxos: [
          new u8.UnshieldedState.UtxoWithMeta({
            utxo: {
              owner,
              intentHash: '11'.repeat(32),
              outputNo: 0,
              type: v8.nativeToken().raw,
              value: supply,
            },
            meta: { ctime: new Date(0), registeredForDustGeneration: false },
          }),
        ],
      },
    ),
  );
  const shielded = s8.Transacting.makeDefaultTransactingCapability(
    { networkId: 'undeployed' },
    () => ({
      coinSelection: chooseCoin,
      coinsAndBalancesCapability:
        s8.CoinsAndBalances.makeDefaultCoinsAndBalancesCapability(),
      keysCapability: s8.Keys.makeDefaultKeysCapability(),
    }),
  );
  const unshielded = u8.Transacting.makeDefaultTransactingCapability(
    { networkId: 'undeployed' },
    () => ({
      coinSelection: chooseCoin,
      coinsAndBalancesCapability:
        u8.CoinsAndBalances.makeDefaultCoinsAndBalancesCapability(),
      keysCapability: u8.Keys.makeDefaultKeysCapability(),
    }),
  );
  return {
    version: ProtocolVersion.MinSupportedVersion,
    shieldedAddress: new ShieldedAddress(
      new ShieldedCoinPublicKey(Buffer.from(receiverKeys.coinPublicKey, 'hex')),
      new ShieldedEncryptionPublicKey(
        Buffer.from(receiverKeys.encryptionPublicKey, 'hex'),
      ),
    ),
    shielded: async (
      inputs: NonNullable<CombinedSwapInputs['shielded']>,
      outputs: TokenTransfer<ShieldedAddress>[],
    ) => {
      const [tx, state] = Either.getOrThrow(
        shielded.initSwap(keys, shieldedState, inputs, outputs, ttl),
      );
      shieldedState = state;
      return WalletTransaction.adopt(
        'Unproven',
        tx,
        ProtocolVersion.MinSupportedVersion,
      );
    },
    unshielded: async (
      inputs: NonNullable<CombinedSwapInputs['unshielded']>,
      outputs: TokenTransfer<UnshieldedAddress>[],
    ) => {
      const result = Either.getOrThrow(
        unshielded.initSwap(unshieldedState, inputs, outputs, ttl),
      );
      unshieldedState = result.newState;
      return WalletTransaction.adopt(
        'Unproven',
        result.transaction,
        ProtocolVersion.MinSupportedVersion,
      );
    },
    received: (bytes: Uint8Array) => {
      const tx = v8.Transaction.deserialize(
        'signature',
        'pre-proof',
        'pre-binding',
        bytes,
      );
      const offer = tx.guaranteedOffer;
      return offer
        ? [...new v8.ZswapLocalState().apply(receiverKeys, offer).coins].map(
            c => ({ type: c.type, value: c.value }),
          )
        : [];
    },
    clear: () => {
      keys.clear();
      receiverKeys.clear();
    },
  };
};

const seededV9 = () => {
  const keys = v9.ZswapSecretKeys.fromSeed(new Uint8Array(32).fill(1));
  const receiverKeys = v9.ZswapSecretKeys.fromSeed(new Uint8Array(32).fill(2));
  const coin = v9.createShieldedCoinInfo(v9.shieldedToken().raw, supply);
  const genesis = v9.ZswapOffer.fromOutput(
    v9.ZswapOutput.new(coin, 0, keys.coinPublicKey, keys.encryptionPublicKey),
    coin.type,
    coin.value,
  );
  let shieldedState = s9.CoreWallet.init(
    new v9.ZswapLocalState().apply(keys, genesis),
    keys,
    'undeployed',
  );
  let unshieldedState = Either.getOrThrow(
    u9.CoreWallet.applyUpdate(
      u9.CoreWallet.init(
        {
          publicKey: { tag: 'schnorr' as const, value: owner },
          addressHex: owner,
          address: '',
        },
        'undeployed',
      ),
      {
        status: 'SUCCESS',
        spentUtxos: [],
        createdUtxos: [
          new u9.UnshieldedState.UtxoWithMeta({
            utxo: {
              owner,
              intentHash: '11'.repeat(32),
              outputNo: 0,
              type: v9.nativeToken().raw,
              value: supply,
            },
            meta: { ctime: new Date(0), registeredForDustGeneration: false },
          }),
        ],
      },
    ),
  );
  const shielded = s9.Transacting.makeDefaultTransactingCapability(
    { networkId: 'undeployed' },
    () => ({
      coinSelection: chooseCoin,
      coinsAndBalancesCapability:
        s9.CoinsAndBalances.makeDefaultCoinsAndBalancesCapability(),
      keysCapability: s9.Keys.makeDefaultKeysCapability(),
    }),
  );
  const unshielded = u9.Transacting.makeDefaultTransactingCapability(
    { networkId: 'undeployed' },
    () => ({
      coinSelection: chooseCoin,
      coinsAndBalancesCapability:
        u9.CoinsAndBalances.makeDefaultCoinsAndBalancesCapability(),
      keysCapability: u9.Keys.makeDefaultKeysCapability(),
    }),
  );
  return {
    version: ProtocolVersion.V9NativeForkVersion,
    shieldedAddress: new ShieldedAddress(
      new ShieldedCoinPublicKey(Buffer.from(receiverKeys.coinPublicKey, 'hex')),
      new ShieldedEncryptionPublicKey(
        Buffer.from(receiverKeys.encryptionPublicKey, 'hex'),
      ),
    ),
    shielded: async (
      inputs: NonNullable<CombinedSwapInputs['shielded']>,
      outputs: TokenTransfer<ShieldedAddress>[],
    ) => {
      const [tx, state] = Either.getOrThrow(
        shielded.initSwap(keys, shieldedState, inputs, outputs, ttl),
      );
      shieldedState = state;
      return WalletTransaction.adopt(
        'Unproven',
        tx,
        ProtocolVersion.V9NativeForkVersion,
      );
    },
    unshielded: async (
      inputs: NonNullable<CombinedSwapInputs['unshielded']>,
      outputs: TokenTransfer<UnshieldedAddress>[],
    ) => {
      const result = Either.getOrThrow(
        unshielded.initSwap(unshieldedState, inputs, outputs, ttl),
      );
      unshieldedState = result.newState;
      return WalletTransaction.adopt(
        'Unproven',
        result.transaction,
        ProtocolVersion.V9NativeForkVersion,
      );
    },
    received: (bytes: Uint8Array) => {
      const tx = v9.Transaction.deserialize(
        'signature',
        'pre-proof',
        'pre-binding',
        bytes,
      );
      const offer = tx.guaranteedOffer;
      return offer
        ? [...new v9.ZswapLocalState().apply(receiverKeys, offer).coins].map(
            c => ({ type: c.type, value: c.value }),
          )
        : [];
    },
    clear: () => {
      keys.clear();
      receiverKeys.clear();
    },
  };
};

describe.each([
  { epoch: 8, seed: seededV8 },
  { epoch: 9, seed: seededV9 },
])('makeIntent receiving legs on v$epoch', ({ epoch, seed }) => {
  it.each(['shielded', 'unshielded'] as const)(
    'preserves exact receipts when only %s inputs are requested',
    async inputKind => {
      const h = await createFacadeHarness();
      const seeded = seed();
      if (epoch === 9) h.crossFork();
      h.shielded.initSwap.mockImplementation(seeded.shielded);
      h.unshielded.initSwap.mockImplementation(seeded.unshielded);
      const outputKind = inputKind === 'shielded' ? 'unshielded' : 'shielded';
      const giveType =
        inputKind === 'shielded'
          ? v8.shieldedToken().raw
          : v8.nativeToken().raw;
      const wantType =
        outputKind === 'shielded'
          ? v8.shieldedToken().raw
          : v8.nativeToken().raw;
      const address =
        outputKind === 'shielded'
          ? ShieldedAddress.codec
              .encode('undeployed', seeded.shieldedAddress)
              .toString()
          : UnshieldedAddress.codec
              .encode(
                'undeployed',
                new UnshieldedAddress(Buffer.from(recipient, 'hex')),
              )
              .toString();
      try {
        const recipe = await h.wallet.initSwap(
          groupMidnightConnectorInputs([
            { kind: inputKind, type: giveType, value: give },
          ]),
          groupMidnightConnectorOutputs(
            [
              {
                kind: outputKind,
                type: wantType,
                value: want,
                recipient: address,
              },
              {
                kind: outputKind,
                type: wantType,
                value: 7n,
                recipient:
                  outputKind === 'unshielded'
                    ? UnshieldedAddress.codec
                        .encode(
                          'undeployed',
                          new UnshieldedAddress(Buffer.alloc(32, 3)),
                        )
                        .toString()
                    : address,
              },
            ],
            'undeployed',
          ),
          { ttl, payFees: false },
        );
        const tx = readMidnightTransaction(recipe.transaction);
        expect(recipe.protocolVersion).toBe(seeded.version);
        expect(
          Object.fromEntries(
            [...tx.imbalances(0)].map(([token, value]) => [
              token.tag === 'dust' ? 'dust' : `${token.tag}:${token.raw}`,
              value,
            ]),
          ),
        ).toEqual({
          [`${inputKind}:${giveType}`]: give,
          [`${outputKind}:${wantType}`]: -(want + 7n),
        });
        if (outputKind === 'unshielded') {
          expect(
            [...(tx.intents?.values() ?? [])].flatMap(
              intent => intent.guaranteedUnshieldedOffer?.outputs ?? [],
            ),
          ).toEqual(
            expect.arrayContaining([
              { owner: recipient, type: wantType, value: want },
              { owner: '03'.repeat(32), type: wantType, value: 7n },
            ]),
          );
          expect(
            [...(tx.intents?.values() ?? [])].flatMap(
              intent => intent.guaranteedUnshieldedOffer?.outputs ?? [],
            ),
          ).toHaveLength(2);
        } else {
          expect(seeded.received(tx.serialize())).toEqual(
            expect.arrayContaining([
              { type: wantType, value: want },
              { type: wantType, value: 7n },
            ]),
          );
          expect(seeded.received(tx.serialize())).toHaveLength(2);
        }
        expect(h.dust.balanceTransactions).not.toHaveBeenCalled();
        expect(h.lifecycle.balanced).toHaveBeenCalledOnce();
      } finally {
        await h.wallet.stop();
        seeded.clear();
      }
    },
  );
});
