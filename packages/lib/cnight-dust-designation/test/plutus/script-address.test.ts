import { describe, expect, it } from 'vitest';

import {
  getDustGeneratorPaymentAddress,
  getDustGeneratorRewardAccount,
  getDustGeneratorScriptHash,
  getDustMappingNftAssetId,
  getDustMappingNftPolicyId,
} from '../../src/plutus/script-address';
import { CardanoDustNetwork } from '../../src/value-objects/network-id.vo';

// =====================================================================
// Script-address golden tests.
// =====================================================================
// Script hash is determined by the embedded CBOR — same input bytes
// must produce the same hash on every run. The bech32 payment +
// reward addresses derive from the hash + network id deterministically.
// On first run, the inline snapshots capture the values; the reviewer
// verifies them against the deployed dapp's on-chain addresses (visible
// in Cardanoscan / Cexplorer for any past registration tx) before
// merging.
// =====================================================================

describe('Dust generator script — testnet (Preview + Preprod)', () => {
  const network = CardanoDustNetwork.testnet;

  it('has a deterministic 28-byte script hash', () => {
    const hash = getDustGeneratorScriptHash(network);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(56);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    expect(hash).toMatchInlineSnapshot(
      `"7e69087d98fac5869eac14e13dfb6f98228c41e638aa2a59d1f85e9c"`,
    );
  });

  it('payment address is an enterprise (payment-script-only) address', () => {
    const addr = getDustGeneratorPaymentAddress(network);
    // Enterprise addresses on testnet start `addr_test1w…` (header
    // type 6: payment-script credential, no stake). Carbon previously
    // mis-built this as a `addr_test1x…` base self-staking address,
    // making every Carbon-created designation invisible to the
    // upstream dapp + Midnight indexer.
    expect(addr.toString().startsWith('addr_test1w')).toBe(true);
    expect(addr).toMatchInlineSnapshot(
      `"addr_test1wplxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qzjheng"`,
    );
  });

  it('reward account is a script-credential stake address', () => {
    const reward = getDustGeneratorRewardAccount(network);
    expect(reward.toString().startsWith('stake_test1')).toBe(true);
    expect(reward).toMatchInlineSnapshot(
      `"stake_test17plxjzranravtp574s2wz00md7vz9rzpucu252je68u9a8qz6fpyz"`,
    );
  });

  it('DUST mapping NFT policy id equals script hash', () => {
    const policyId = getDustMappingNftPolicyId(network);
    const scriptHash = getDustGeneratorScriptHash(network);
    expect(policyId.toString()).toBe(scriptHash.toString());
  });

  it('DUST mapping NFT asset id has empty asset name', () => {
    const assetId = getDustMappingNftAssetId(network);
    expect(assetId.toString()).toMatchInlineSnapshot(
      `"7e69087d98fac5869eac14e13dfb6f98228c41e638aa2a59d1f85e9c"`,
    );
  });
});

describe('Dust generator script — mainnet', () => {
  const network = CardanoDustNetwork.mainnet;

  it('script hash differs from testnet', () => {
    expect(getDustGeneratorScriptHash(network)).not.toBe(
      getDustGeneratorScriptHash(CardanoDustNetwork.testnet),
    );
    expect(getDustGeneratorScriptHash(network)).toMatchInlineSnapshot(
      `"73e4aea31b5b51d9b0ca386196fc6a4c422f74c5aea011e4b8bdf4e5"`,
    );
  });

  it('payment address is an enterprise (payment-script-only) address', () => {
    const addr = getDustGeneratorPaymentAddress(network);
    // Mainnet enterprise prefix `addr1w…` (header type 6). Matches
    // the address where the 3 333 live mainnet designations sit
    // (verified on-chain).
    expect(addr.toString().startsWith('addr1w')).toBe(true);
    expect(addr).toMatchInlineSnapshot(
      `"addr1w9e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfeg9lvhq7"`,
    );
  });

  it('reward account starts with stake1', () => {
    const reward = getDustGeneratorRewardAccount(network);
    expect(reward.toString().startsWith('stake1')).toBe(true);
    expect(reward).toMatchInlineSnapshot(
      `"stake179e7ft4rrdd4rkdseguxr9hudfxyytm5ckh2qy0yhz7lfege4v3uv"`,
    );
  });
});
