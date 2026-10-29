import { Cardano } from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import {
  createCustodyAccountRecord,
  CURRENT_CUSTODY_CONTRACT_VERSION,
  deriveCustodyAccountIdentity,
  deriveCustodyDeviceKey,
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS,
} from '@lace-lib/cardano-custody';
import { afterEach, describe, expect, it } from 'vitest';

import {
  CardanoCustodyBuildFailedError,
  CardanoCustodyIndexExhaustedError,
  CardanoCustodyUnsupportedVersionError,
} from '../../src/custody/cardano-custody-errors';
import { recoverCardanoCustodyAccounts } from '../../src/custody/recover-cardano-custody-accounts';

import {
  createCustodyTestWallet,
  DEVICE_0,
  hostedChannel,
  PREPROD,
  TESTNET_CUSTODY_XPUB,
} from './custody-fixtures';

import type {
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
} from '@lace-contract/cardano-context';
import type {
  CustodyAccountRecord,
  CustodyContractVersion,
} from '@lace-lib/cardano-custody';

/**
 * The version registry every custody helper reads. Tests add synthetic
 * later versions to it, as a release would, and remove them afterwards.
 */
const registry =
  SUPPORTED_CUSTODY_CONTRACT_VERSIONS as CustodyContractVersion[];
const SUPPORTED_COUNT = registry.length;
const supportVersion = (version: CustodyContractVersion) => {
  registry.push(version);
};

const CURRENT = CURRENT_CUSTODY_CONTRACT_VERSION.accountValidatorHash;

/** A later contract version whose keys share the current CIP-1854 account. */
const nextVersion: CustodyContractVersion = {
  ...CURRENT_CUSTODY_CONTRACT_VERSION,
  accountValidatorHash: Crypto.Hash28ByteBase16('5e'.repeat(28)),
};

const OTHER_ACCOUNT_INDEX = 7;

/** A later contract version whose keys live under another CIP-1854 account. */
const otherAccountVersion: CustodyContractVersion = {
  ...CURRENT_CUSTODY_CONTRACT_VERSION,
  accountValidatorHash: Crypto.Hash28ByteBase16('6e'.repeat(28)),
  deviceAccountIndex: { default: OTHER_ACCOUNT_INDEX, byNetworkMagic: {} },
};

/** Stands in for the passkey's key of CIP-1854 account 7: any other valid key. */
const otherAccountXpub = async () => {
  await Crypto.ready();
  return Crypto.Bip32PublicKey.fromHex(TESTNET_CUSTODY_XPUB).derive([9]).hex();
};

const device = {
  extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
  networkMagic: Cardano.NetworkMagics.Preprod,
  channel: hostedChannel,
};

const keyAt = async (index: number, xpub = TESTNET_CUSTODY_XPUB) => {
  const key = await deriveCustodyDeviceKey(xpub, index);
  if (!key.ok) throw new Error('The fixture key must derive');
  return key.value;
};

const recordAt = async (
  index: number,
  contractVersion = CURRENT_CUSTODY_CONTRACT_VERSION,
  xpub = TESTNET_CUSTODY_XPUB,
): Promise<CustodyAccountRecord> => {
  const identity = deriveCustodyAccountIdentity({
    contractVersion,
    creatorKeyHash: (await keyAt(index, xpub)).keyHash,
    chainId: PREPROD,
  });
  if (!identity.ok) throw new Error('The fixture identity must derive');
  return createCustodyAccountRecord(identity.value);
};

type Status = 'account' | 'pre-registered' | 'unregistered';

/**
 * Answers every probe from a chain layout: the status of each creator index
 * per contract version, unregistered unless listed. An account's record is
 * looked up by creator index, in the version's own records when given.
 */
const answerFrom =
  (
    layout: Partial<Record<string, (index: number) => Status>>,
    records: Partial<Record<number, CustodyAccountRecord>> = {},
    recordsByVersion: Partial<
      Record<string, Partial<Record<number, CustodyAccountRecord>>>
    > = {},
  ) =>
  (
    request: CardanoCustodyCreatorIndexProbeRequest,
  ): { ok: true; result: CardanoCustodyCreatorIndexProbeResult } => {
    const { accountValidatorHash, creatorIndex } = request;
    const status =
      layout[accountValidatorHash]?.(creatorIndex) ?? 'unregistered';
    return {
      ok: true,
      result:
        status === 'account'
          ? {
              accountValidatorHash,
              creatorIndex,
              status,
              record: (recordsByVersion[accountValidatorHash] ?? records)[
                creatorIndex
              ]!,
            }
          : { accountValidatorHash, creatorIndex, status },
    };
  };

const indicesOf = (
  probes: CardanoCustodyCreatorIndexProbeRequest[],
  version = CURRENT,
) =>
  probes
    .filter(probe => probe.accountValidatorHash === version)
    .map(({ creatorIndex }) => creatorIndex);

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, offset) => from + offset);

describe('recoverCardanoCustodyAccounts', () => {
  afterEach(() => {
    registry.splice(SUPPORTED_COUNT);
  });

  it('opens every account the passkey created until the gap of unregistered indices', async () => {
    const test = createCustodyTestWallet();
    const records = { 0: await recordAt(0), 3: await recordAt(3) };
    // Index 0 holds an account; 1 and 2 are pre-registered by someone else.
    test.control.answerProbe = answerFrom(
      {
        [CURRENT]: index =>
          index === 0 || index === 3
            ? 'account'
            : index < 3
            ? 'pre-registered'
            : 'unregistered',
      },
      records,
    );

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    const { accounts, unscannedVersions } = recovered.unwrap();
    expect(accounts.map(({ creatorIndex }) => creatorIndex)).toEqual([0, 3]);
    expect(accounts.map(({ record }) => record)).toEqual([
      records[0],
      records[3],
    ]);
    expect(unscannedVersions).toEqual([]);
    expect(indicesOf(test.probes)).toEqual(range(0, 24));
    const opened = test.custodyAccount(accounts[1].accountId);
    expect(opened).toMatchObject({
      metadata: { name: 'Cardano custody #3' },
      blockchainSpecific: {
        address: records[3].address,
        device: {
          extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
          index: 3,
          keyHash: (await keyAt(3)).keyHash,
          channel: hostedChannel,
        },
      },
    });
    expect(
      test.custodyAccount(accounts[0].accountId)?.blockchainSpecific.device
        ?.keyHash,
    ).toBe(DEVICE_0);
  });

  it('probes each index with the device key, builds nothing and asks no sponsor', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom({});

    await recoverCardanoCustodyAccounts(test.wallet, { device, startIndex: 7 });

    expect(test.probes[0]).toEqual({
      requestId: expect.any(String) as unknown,
      accountValidatorHash: CURRENT,
      deviceAccountPublicKey: TESTNET_CUSTODY_XPUB,
      creatorIndex: 7,
    });
    expect(indicesOf(test.probes)).toEqual(range(7, 27));
    expect(test.builds).toEqual([]);
    expect(test.submitted).toEqual([]);
  });

  it('skips a run of pre-registered indices without counting it as a gap', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom({
      [CURRENT]: index => (index < 100 ? 'pre-registered' : 'unregistered'),
    });

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.unwrap().accounts).toEqual([]);
    expect(indicesOf(test.probes)).toEqual(range(0, 120));
  });

  it('keeps counting the gap across a pre-registered run', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom({
      [CURRENT]: index =>
        index >= 10 && index < 15 ? 'pre-registered' : 'unregistered',
    });

    await recoverCardanoCustodyAccounts(test.wallet, { device });

    // Ten unregistered indices before the run and ten after it.
    expect(indicesOf(test.probes)).toEqual(range(0, 25));
  });

  it('scans every supported contract version and opens the accounts of each', async () => {
    supportVersion(nextVersion);
    const test = createCustodyTestWallet();
    const current = { 2: await recordAt(2) };
    const next = { 4: await recordAt(4, nextVersion) };
    test.control.answerProbe = answerFrom(
      {
        [CURRENT]: index => (index === 2 ? 'account' : 'unregistered'),
        [nextVersion.accountValidatorHash]: index =>
          index === 4
            ? 'account'
            : index < 3
            ? 'pre-registered'
            : 'unregistered',
      },
      {},
      { [CURRENT]: current, [nextVersion.accountValidatorHash]: next },
    );

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    const { accounts } = recovered.unwrap();
    expect(accounts).toEqual([
      expect.objectContaining({ creatorIndex: 2, record: current[2] }),
      expect.objectContaining({ creatorIndex: 4, record: next[4] }),
    ]);
    expect(indicesOf(test.probes)).toEqual(range(0, 23));
    expect(indicesOf(test.probes, nextVersion.accountValidatorHash)).toEqual(
      range(0, 25),
    );
    // Oldest version first, each scanned to its own gap.
    expect(test.probes.at(23)?.accountValidatorHash).toBe(
      nextVersion.accountValidatorHash,
    );
    expect(test.custodyAccount(accounts[1].accountId)).toMatchObject({
      blockchainSpecific: {
        accountValidatorHash: nextVersion.accountValidatorHash,
        address: next[4].address,
        device: {
          extendedAccountPublicKey: TESTNET_CUSTODY_XPUB,
          index: 4,
          keyHash: (await keyAt(4)).keyHash,
        },
      },
    });
  });

  it('scans a version under another CIP-1854 account with that account key, and binds the device under it', async () => {
    supportVersion(otherAccountVersion);
    const otherXpub = await otherAccountXpub();
    const test = createCustodyTestWallet();
    const other = { 1: await recordAt(1, otherAccountVersion, otherXpub) };
    test.control.answerProbe = answerFrom(
      {
        [otherAccountVersion.accountValidatorHash]: index =>
          index === 1 ? 'account' : 'unregistered',
      },
      {},
      { [otherAccountVersion.accountValidatorHash]: other },
    );

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device: {
        ...device,
        extendedAccountPublicKeys: { [OTHER_ACCOUNT_INDEX]: otherXpub },
      },
    });

    const { accounts, unscannedVersions } = recovered.unwrap();
    expect(unscannedVersions).toEqual([]);
    expect(
      test.probes
        .filter(
          probe =>
            probe.accountValidatorHash ===
            otherAccountVersion.accountValidatorHash,
        )
        .every(probe => probe.deviceAccountPublicKey === otherXpub),
    ).toBe(true);
    expect(
      test.probes
        .filter(probe => probe.accountValidatorHash === CURRENT)
        .every(probe => probe.deviceAccountPublicKey === TESTNET_CUSTODY_XPUB),
    ).toBe(true);
    expect(accounts).toEqual([
      expect.objectContaining({ creatorIndex: 1, record: other[1] }),
    ]);
    expect(
      test.custodyAccount(accounts[0].accountId)?.blockchainSpecific.device,
    ).toEqual({
      extendedAccountPublicKey: otherXpub,
      index: 1,
      keyHash: (await keyAt(1, otherXpub)).keyHash,
      channel: hostedChannel,
    });
  });

  it('lists a version under another CIP-1854 account as unscanned without its key', async () => {
    supportVersion(otherAccountVersion);
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom({});

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device: {
        ...device,
        // A key for some other account does not stand in for it.
        extendedAccountPublicKeys: { 8: await otherAccountXpub() },
      },
    });

    expect(recovered.unwrap().unscannedVersions).toEqual([
      {
        accountValidatorHash: otherAccountVersion.accountValidatorHash,
        deviceAccountIndex: OTHER_ACCOUNT_INDEX,
      },
    ]);
    expect(
      indicesOf(test.probes, otherAccountVersion.accountValidatorHash),
    ).toEqual([]);
  });

  it('names accounts as asked', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom(
      { [CURRENT]: index => (index === 0 ? 'account' : 'unregistered') },
      { 0: await recordAt(0) },
    );

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
      name: index => `Vault ${index}`,
    });

    expect(
      test.custodyAccount(recovered.unwrap().accounts[0].accountId)?.metadata
        .name,
    ).toBe('Vault 0');
  });

  it('stops at its probe limit and opens nothing', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = answerFrom(
      { [CURRENT]: index => (index === 0 ? 'account' : 'pre-registered') },
      { 0: await recordAt(0) },
    );

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.isErr() && recovered.error).toEqual(
      new CardanoCustodyIndexExhaustedError(0, 1000),
    );
    expect(test.probes).toHaveLength(1000);
    expect(test.wallets$.value).toEqual([]);
  });

  it('bounds the probes of every version together', async () => {
    supportVersion(nextVersion);
    const test = createCustodyTestWallet();
    // The first version takes 970 pre-registered and 20 unregistered
    // probes, leaving ten for the next.
    test.control.answerProbe = answerFrom({
      [CURRENT]: index => (index < 970 ? 'pre-registered' : 'unregistered'),
    });

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.isErr() && recovered.error).toBeInstanceOf(
      CardanoCustodyIndexExhaustedError,
    );
    expect(indicesOf(test.probes, nextVersion.accountValidatorHash)).toEqual(
      range(0, 10),
    );
  });

  it('reports a failed probe and opens nothing', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = () => ({
      ok: false,
      error: { code: 'unavailable', message: 'provider down' },
    });

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.isErr() && recovered.error).toBeInstanceOf(
      CardanoCustodyBuildFailedError,
    );
    expect(test.wallets$.value).toEqual([]);
  });

  it('reports a contract version the module does not support', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = ({ accountValidatorHash }) => ({
      ok: false,
      error: { code: 'unsupported-contract-version', accountValidatorHash },
    });

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.isErr() && recovered.error).toEqual(
      new CardanoCustodyUnsupportedVersionError(CURRENT),
    );
  });

  it('refuses a device key of another network', async () => {
    const test = createCustodyTestWallet();

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device: { ...device, networkMagic: Cardano.NetworkMagics.Mainnet },
    });

    expect(recovered.isErr() && recovered.error).toMatchObject({
      reason: 'network-mismatch',
    });
    expect(test.probes).toEqual([]);
  });

  it('waits for a new wallet to select its network before probing', async () => {
    const test = createCustodyTestWallet();
    test.chainId$.next(undefined);
    test.control.answerProbe = answerFrom({});

    const recovering = recoverCardanoCustodyAccounts(test.wallet, { device });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(test.probes).toEqual([]);
    test.chainId$.next(PREPROD);

    expect((await recovering).isOk()).toBe(true);
    expect(test.probes).not.toEqual([]);
  });

  it('reports a thrown non-error as an error', async () => {
    const test = createCustodyTestWallet();
    test.control.answerProbe = () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'probe exploded';
    };

    const recovered = await recoverCardanoCustodyAccounts(test.wallet, {
      device,
    });

    expect(recovered.isErr() && recovered.error).toEqual(
      new Error('probe exploded'),
    );
  });
});
