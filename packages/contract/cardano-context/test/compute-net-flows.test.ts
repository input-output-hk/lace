import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it } from 'vitest';

import { computeNetFlows } from '../src/compute-net-flows';

import type {
  AssetInfoWithAmount,
  TokenTransferValue as SdkTokenTransferValue,
} from '@cardano-sdk/core';

const OWN_ADDR_1 = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);

const OWN_ADDR_2 = Cardano.PaymentAddress(
  'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwqfjkjv7',
);

const FOREIGN_ADDR = Cardano.PaymentAddress(
  'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
);

const ADA_LOVELACE = 1_000_000n;

const makeTokenTransferValue = (
  coins: bigint,
  assets: Map<Cardano.AssetId, bigint> = new Map(),
): SdkTokenTransferValue => ({
  coins,
  assets: new Map(
    [...assets].map(([id, amount]) => [id, { amount } as AssetInfoWithAmount]),
  ),
});

describe('computeNetFlows', () => {
  describe('foreign addresses pass through unchanged', () => {
    it('keeps a foreign from-address directly in the from map', () => {
      const fromRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(-10n * ADA_LOVELACE)],
      ]);
      const toRaw = new Map<Cardano.PaymentAddress, SdkTokenTransferValue>();

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.size).toBe(1);
      expect(from.get(FOREIGN_ADDR)?.coins).toBe(-10n * ADA_LOVELACE);
      expect(to.size).toBe(0);
    });

    it('keeps a foreign to-address directly in the to map', () => {
      const fromRaw = new Map<Cardano.PaymentAddress, SdkTokenTransferValue>();
      const toRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(7n * ADA_LOVELACE)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(to.size).toBe(1);
      expect(to.get(FOREIGN_ADDR)?.coins).toBe(7n * ADA_LOVELACE);
      expect(from.size).toBe(0);
    });

    it('places the same foreign address in both maps when it appears in fromRaw and toRaw', () => {
      const fromRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(-5n * ADA_LOVELACE)],
      ]);
      const toRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(3n * ADA_LOVELACE)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.get(FOREIGN_ADDR)?.coins).toBe(-5n * ADA_LOVELACE);
      expect(to.get(FOREIGN_ADDR)?.coins).toBe(3n * ADA_LOVELACE);
    });
  });

  describe('send flow: own input -> foreign payment + own change', () => {
    it('nets own input and own change; wallet representative goes in from with net spending amount', () => {
      const inputCoins = 10n * ADA_LOVELACE;
      const changeCoins = 3n * ADA_LOVELACE;
      const foreignCoins = 6_810_000n;

      const fromRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(inputCoins * -1n)],
      ]);
      const toRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(foreignCoins)],
        [OWN_ADDR_1, makeTokenTransferValue(changeCoins)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.get(OWN_ADDR_1)?.coins).toBe(changeCoins - inputCoins);
      expect(to.has(OWN_ADDR_1)).toBe(false);
      expect(to.get(FOREIGN_ADDR)?.coins).toBe(foreignCoins);
    });
  });

  describe('receive flow: foreign input -> own output', () => {
    it('places wallet representative in to map with the incoming coin amount', () => {
      const fromCoins = 10n * ADA_LOVELACE;
      const toCoins = 10n * ADA_LOVELACE;

      const fromRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(fromCoins * -1n)],
      ]);
      const toRaw = new Map([[OWN_ADDR_1, makeTokenTransferValue(toCoins)]]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.get(FOREIGN_ADDR)?.coins).toBe(fromCoins * -1n);
      expect(to.get(OWN_ADDR_1)?.coins).toBe(toCoins);
      expect(from.has(OWN_ADDR_1)).toBe(false);
    });
  });

  describe('self-transfer: own input -> own output (fee deduction)', () => {
    it('puts wallet representative in from with the fee as net spending amount', () => {
      const inputCoins = 10n * ADA_LOVELACE;
      const outputCoins = 9_800_000n;

      const fromRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(inputCoins * -1n)],
      ]);
      const toRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(outputCoins)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.get(OWN_ADDR_1)?.coins).toBe(outputCoins - inputCoins);
      expect(to.size).toBe(0);
    });
  });

  describe('native token flows', () => {
    it('nets the same asset across input and change; only net leaving amount appears in from', () => {
      const assetId = Cardano.AssetId(
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745',
      );

      const fromRaw = new Map([
        [
          OWN_ADDR_1,
          makeTokenTransferValue(
            -5n * ADA_LOVELACE,
            new Map([[assetId, -100n]]),
          ),
        ],
      ]);
      const toRaw = new Map([
        [
          FOREIGN_ADDR,
          makeTokenTransferValue(3n * ADA_LOVELACE, new Map([[assetId, 80n]])),
        ],
        [
          OWN_ADDR_1,
          makeTokenTransferValue(1_800_000n, new Map([[assetId, 20n]])),
        ],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(from.get(OWN_ADDR_1)?.assets.get(assetId)).toBe(-80n);
      expect(to.get(FOREIGN_ADDR)?.assets.get(assetId)).toBe(80n);
    });

    it('places incoming native tokens on the wallet entry in to', () => {
      const assetId = Cardano.AssetId(
        '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745',
      );
      const outgoingAssets = new Map([[assetId, -50n]]);
      const incomingAssets = new Map([[assetId, 50n]]);

      const fromRaw = new Map([
        [
          FOREIGN_ADDR,
          makeTokenTransferValue(-5n * ADA_LOVELACE, outgoingAssets),
        ],
      ]);
      const toRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(5n * ADA_LOVELACE, incomingAssets)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [OWN_ADDR_1]);

      expect(to.get(OWN_ADDR_1)?.assets.get(assetId)).toBe(50n);
      expect(from.has(OWN_ADDR_1)).toBe(false);
    });
  });

  describe('multiple own addresses', () => {
    it('sums coins across two own inputs into a single wallet representative', () => {
      const fromRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(-6n * ADA_LOVELACE)],
        [OWN_ADDR_2, makeTokenTransferValue(-4n * ADA_LOVELACE)],
      ]);
      const toRaw = new Map([
        [FOREIGN_ADDR, makeTokenTransferValue(8n * ADA_LOVELACE)],
        [OWN_ADDR_1, makeTokenTransferValue(1_800_000n)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, [
        OWN_ADDR_1,
        OWN_ADDR_2,
      ]);

      expect(from.get(OWN_ADDR_1)?.coins).toBe(
        -(6n * ADA_LOVELACE + 4n * ADA_LOVELACE - 1_800_000n),
      );
      expect(from.has(OWN_ADDR_2)).toBe(false);
      expect(to.has(OWN_ADDR_1)).toBe(false);
      expect(to.has(OWN_ADDR_2)).toBe(false);
      expect(to.get(FOREIGN_ADDR)?.coins).toBe(8n * ADA_LOVELACE);
    });
  });

  describe('empty inputs', () => {
    it('returns empty maps when both fromRaw and toRaw are empty', () => {
      const { from, to } = computeNetFlows(new Map(), new Map(), [OWN_ADDR_1]);

      expect(from.size).toBe(0);
      expect(to.size).toBe(0);
    });

    it('passes all addresses through as foreign when ownAddresses is empty', () => {
      const fromRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(-5n * ADA_LOVELACE)],
      ]);
      const toRaw = new Map([
        [OWN_ADDR_1, makeTokenTransferValue(3n * ADA_LOVELACE)],
      ]);

      const { from, to } = computeNetFlows(fromRaw, toRaw, []);

      expect(from.get(OWN_ADDR_1)?.coins).toBe(-5n * ADA_LOVELACE);
      expect(to.get(OWN_ADDR_1)?.coins).toBe(3n * ADA_LOVELACE);
    });
  });
});
