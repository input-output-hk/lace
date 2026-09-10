import { Cardano } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { Bip32Account } from '@lace-lib/core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  laceErrorToProviderError,
  mapHostParams,
  reconstructAddresses,
  transportUtxoToCardano,
} from '../src/mappers';

import type { CardanoParams } from '@lace-lib/extension-shell-api';

// libsodium's RNG probe reads `self` at instantiation (present in a browser
// context, absent in node) — the same shim the host suite uses.
(globalThis as Record<string, unknown>).self ??= globalThis;

// The golden account xpub (m/1852'/1815'/0') — its derived addresses are stable
// across the pinned @cardano-sdk (shared with the host address suite).
const ACCOUNT_XPUB =
  'b3f8aad750c8f498d2882d1ecd74bf550e81870e89acaed82e8e10ef5871887091286d601ecfe0aafc2121154db787bf489ccf35c6b5db5d60096052c8b34c2f';
const PREPROD: Cardano.ChainId = {
  networkId: 0 as Cardano.NetworkId,
  networkMagic: 1 as Cardano.NetworkMagic,
};
const MAINNET: Cardano.ChainId = {
  networkId: 1 as Cardano.NetworkId,
  networkMagic: 764_824_073 as Cardano.NetworkMagic,
};

// A native asset id lifted from a real preprod tx (policyId ‖ assetName hex).
const WDOGE_ASSET_ID =
  '648823ffdad1610b4162f4dbc87bd47f6f9cf45d772ddef661eff1984577444f4745';

const FULL_PARAMS: CardanoParams = {
  minFeeCoefficient: 44,
  minFeeConstant: 155_381,
  coinsPerUtxoByte: 4310,
  maxTxSize: 16_384,
  maxValueSize: 5000,
  collateralPercentage: 150,
  maxCollateralInputs: 3,
  stakeKeyDeposit: 2_000_000,
  poolDeposit: 500_000_000,
  desiredNumberOfPools: 500,
  monetaryExpansion: '0.003',
  poolInfluence: '0.3',
  prices: { memory: 0.0577, steps: 0.000_072_1 },
  dRepDeposit: 500_000_000,
  minFeeRefScriptCostPerByte: '15',
};

describe('cardano-host-pull mappers', () => {
  let crypto: ConstructorParameters<typeof Bip32Account>[1];
  let externalAddress: string;
  let internalAddress: string;
  let mainnetExternalAddress: string;
  /** A used receive address far past the contiguous low indices. */
  let sparseExternalAddress: string;
  /** Addresses under stake key 1 — a multi-delegation wallet, which the host
   * discovers and dedupes into the same flat per-role lists. */
  let secondStakeKeyAddress: string;
  let secondStakeKeyInternalAddress: string;
  /** A used receive address far past the low indices UNDER stake key 1. */
  let sparseSecondStakeKeyAddress: string;
  /** A receive address under stake key 2, with stake key 1 left unused. */
  let thirdStakeKeyAddress: string;

  beforeAll(async () => {
    crypto = await Bip32Account.createDefaultDependencies();
    const preprod = new Bip32Account(
      {
        extendedAccountPublicKey: ACCOUNT_XPUB as never,
        chainId: PREPROD,
        accountIndex: 0,
      },
      crypto,
    );
    externalAddress = (
      await preprod.deriveAddress({ type: AddressType.External, index: 0 }, 0)
    ).address;
    internalAddress = (
      await preprod.deriveAddress({ type: AddressType.Internal, index: 0 }, 0)
    ).address;
    sparseExternalAddress = (
      await preprod.deriveAddress({ type: AddressType.External, index: 50 }, 0)
    ).address;
    secondStakeKeyAddress = (
      await preprod.deriveAddress({ type: AddressType.External, index: 0 }, 1)
    ).address;
    secondStakeKeyInternalAddress = (
      await preprod.deriveAddress({ type: AddressType.Internal, index: 1 }, 1)
    ).address;
    sparseSecondStakeKeyAddress = (
      await preprod.deriveAddress({ type: AddressType.External, index: 30 }, 1)
    ).address;
    thirdStakeKeyAddress = (
      await preprod.deriveAddress({ type: AddressType.External, index: 0 }, 2)
    ).address;
    const mainnet = new Bip32Account(
      {
        extendedAccountPublicKey: ACCOUNT_XPUB as never,
        chainId: MAINNET,
        accountIndex: 0,
      },
      crypto,
    );
    mainnetExternalAddress = (
      await mainnet.deriveAddress({ type: AddressType.External, index: 0 }, 0)
    ).address;
  });

  describe('transportUtxoToCardano', () => {
    it('revives a lovelace-only utxo into a hydrated Cardano.Utxo', () => {
      const [txIn, txOut] = transportUtxoToCardano({
        txId: '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
        index: 2,
        address: externalAddress,
        lovelace: '5000000',
      });
      expect(txIn.index).toBe(2);
      expect(String(txIn.txId)).toBe(
        '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
      );
      expect(String(txIn.address)).toBe(externalAddress);
      expect(txOut.value.coins).toBe(5_000_000n);
      expect(txOut.value.assets).toBeUndefined();
    });

    it('revives native assets from the decimal-string map', () => {
      const [, txOut] = transportUtxoToCardano({
        txId: '260aed6e7a24044b1254a87a509468a649f522a4e54e830ac10f27ea7b5ec61f',
        index: 0,
        address: externalAddress,
        lovelace: '1500000',
        assets: { [WDOGE_ASSET_ID]: '42' },
      });
      expect(txOut.value.coins).toBe(1_500_000n);
      expect(txOut.value.assets?.get(Cardano.AssetId(WDOGE_ASSET_ID))).toBe(
        42n,
      );
    });
  });

  describe('mapHostParams', () => {
    it('maps every RequiredProtocolParameters field, including the Conway pair', () => {
      expect(mapHostParams(FULL_PARAMS)).toMatchObject({
        minFeeCoefficient: 44,
        minFeeConstant: 155_381,
        coinsPerUtxoByte: 4310,
        maxTxSize: 16_384,
        maxValueSize: 5000,
        collateralPercentage: 150,
        maxCollateralInputs: 3,
        stakeKeyDeposit: 2_000_000,
        poolDeposit: 500_000_000,
        desiredNumberOfPools: 500,
        monetaryExpansion: '0.003',
        poolInfluence: '0.3',
        prices: { memory: 0.0577, steps: 0.000_072_1 },
        dRepDeposit: 500_000_000,
        minFeeRefScriptCostPerByte: '15',
      });
    });

    it('omits the optional Conway fields when the host does not carry them', () => {
      const { dRepDeposit, minFeeRefScriptCostPerByte, ...rest } = FULL_PARAMS;
      void dRepDeposit;
      void minFeeRefScriptCostPerByte;
      const mapped = mapHostParams(rest);
      expect('dRepDeposit' in mapped).toBe(false);
      expect('minFeeRefScriptCostPerByte' in mapped).toBe(false);
      expect(mapped.maxValueSize).toBe(5000);
    });
  });

  describe('laceErrorToProviderError', () => {
    it('carries the host code and message', () => {
      const error = laceErrorToProviderError({
        code: 'refused',
        message: 'nope',
      });
      expect(error.message).toContain('refused');
      expect(error.message).toContain('nope');
    });
  });

  describe('reconstructAddresses', () => {
    it('reconstructs both roles from the xpub, matching the host sets', async () => {
      const { addresses, matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [externalAddress],
        internal: [internalAddress],
        crypto,
      });
      expect(matched).toBe(2);
      const rendered = addresses.map(address => String(address.address));
      expect(rendered).toContain(externalAddress);
      expect(rendered).toContain(internalAddress);
      // Each reconstructed address carries full CardanoAddressData (no secret).
      const external = addresses.find(
        address => String(address.address) === externalAddress,
      );
      expect(external?.data?.rewardAccount).toBeDefined();
      expect(external?.data?.type).toBe(AddressType.External);
      expect(external?.data?.index).toBe(0);
    });

    it('always includes external index 0 even when the host set is empty', async () => {
      const { addresses } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [],
        internal: [],
        crypto,
      });
      expect(addresses.map(address => String(address.address))).toContain(
        externalAddress,
      );
    });

    it('reconstructs a SPARSE used-index set (activity resumed far past the last used index)', async () => {
      const { addresses, matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [externalAddress, sparseExternalAddress],
        internal: [internalAddress],
        crypto,
      });
      // A fixed probe window past the set size would stop long before index 50
      // and drop the address (and its utxos) without a word.
      expect(matched).toBe(3);
      expect(addresses.map(address => String(address.address))).toContain(
        sparseExternalAddress,
      );
    });

    it('reconstructs both roles under a SECOND stake key (multi-delegation wallet)', async () => {
      const { addresses, matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [externalAddress, secondStakeKeyAddress],
        internal: [internalAddress, secondStakeKeyInternalAddress],
        crypto,
      });
      expect(matched).toBe(4);
      const rendered = addresses.map(address => String(address.address));
      expect(rendered).toContain(secondStakeKeyAddress);
      expect(rendered).toContain(secondStakeKeyInternalAddress);
      const second = addresses.find(
        address => String(address.address) === secondStakeKeyAddress,
      );
      // The owning stake key rides along in the address data, so the guest does
      // not attribute a second-stake-key address to the primary credential.
      expect(second?.data?.stakeKeyDerivationPath?.index).toBe(1);
      expect(String(second?.data?.rewardAccount)).not.toBe(
        String(
          addresses.find(address => String(address.address) === externalAddress)
            ?.data?.rewardAccount,
        ),
      );
    });

    it('reconstructs across a GAP in stake keys (stake 0 and stake 2 used)', async () => {
      const { addresses, matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [externalAddress, thirdStakeKeyAddress],
        internal: [],
        crypto,
      });
      // An unused stake key only advances the stake gap, so a wallet that
      // delegated, abandoned a stake key, then delegated again reconstructs whole.
      expect(matched).toBe(2);
      expect(addresses.map(address => String(address.address))).toContain(
        thirdStakeKeyAddress,
      );
    });

    it('reconstructs a SPARSE payment index under a non-zero stake key', async () => {
      const { addresses, matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [externalAddress, sparseSecondStakeKeyAddress],
        internal: [],
        crypto,
      });
      expect(matched).toBe(2);
      expect(addresses.map(address => String(address.address))).toContain(
        sparseSecondStakeKeyAddress,
      );
    });

    it('reports zero matches on a baked-network-magic mismatch (fail-loud input)', async () => {
      // Host set holds a MAINNET address while we reconstruct on PREPROD:
      // derived ∩ host = ∅ under every stake key walked, which the composite
      // turns into a loud failure.
      const { matched } = await reconstructAddresses({
        xpub: ACCOUNT_XPUB,
        accountIndex: 0,
        chainId: PREPROD,
        external: [mainnetExternalAddress],
        internal: [],
        crypto,
      });
      expect(matched).toBe(0);
    });
  });
});
