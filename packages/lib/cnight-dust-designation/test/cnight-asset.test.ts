import { describe, expect, it } from 'vitest';

import {
  getCnightAssetId,
  getCnightAssetName,
  getCnightPolicyId,
  MAINNET_CNIGHT_ASSET_NAME,
  MAINNET_CNIGHT_POLICY_ID,
  TESTNET_CNIGHT_ASSET_NAME,
  TESTNET_CNIGHT_POLICY_ID,
} from '../src/cnight-asset';
import { CardanoDustNetwork } from '../src/value-objects/network-id.vo';

describe('cNIGHT / NIGHT asset identification', () => {
  it('testnet policy id matches validator-repo aiken.toml', () => {
    // Pinned from https://github.com/midnightntwrk/midnight-reserve-contracts,
    // aiken.toml: `config.{preview,preprod}.cnight_policy.bytes`
    // (Preview + Preprod share the same testnet policy).
    expect(TESTNET_CNIGHT_POLICY_ID.toString()).toBe(
      'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
    );
  });

  it('mainnet policy id matches validator-repo aiken.toml', () => {
    // Pinned from aiken.toml: `config.mainnet.cnight_policy.bytes`
    expect(MAINNET_CNIGHT_POLICY_ID.toString()).toBe(
      '0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa',
    );
  });

  it('testnet asset name is empty', () => {
    expect(TESTNET_CNIGHT_ASSET_NAME.toString()).toBe('');
  });

  it('mainnet asset name is "NIGHT" in hex', () => {
    // 0x4e49474854 = ASCII "NIGHT"
    expect(MAINNET_CNIGHT_ASSET_NAME.toString()).toBe('4e49474854');
  });

  it('asset id selector composes policy + asset name', () => {
    const testnetId = getCnightAssetId(CardanoDustNetwork.testnet);
    const mainnetId = getCnightAssetId(CardanoDustNetwork.mainnet);
    expect(testnetId.toString()).toBe(
      'd2dbff622e509dda256fedbd31ef6e9fd98ed49ad91d5c0e07f68af1',
    );
    expect(mainnetId.toString()).toBe(
      '0691b2fecca1ac4f53cb6dfb00b7013e561d1f34403b957cbb5af1fa4e49474854',
    );
  });

  it('policy id + asset name selectors agree per network', () => {
    expect(getCnightPolicyId(CardanoDustNetwork.testnet)).toBe(
      TESTNET_CNIGHT_POLICY_ID,
    );
    expect(getCnightPolicyId(CardanoDustNetwork.mainnet)).toBe(
      MAINNET_CNIGHT_POLICY_ID,
    );
    expect(getCnightAssetName(CardanoDustNetwork.testnet)).toBe(
      TESTNET_CNIGHT_ASSET_NAME,
    );
    expect(getCnightAssetName(CardanoDustNetwork.mainnet)).toBe(
      MAINNET_CNIGHT_ASSET_NAME,
    );
  });
});
