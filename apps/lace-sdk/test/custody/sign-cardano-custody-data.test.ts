import { HexBlob } from '@cardano-sdk/util';
import {
  CardanoCustodyRequestRefusedError,
  signCardanoCustodyDataWithWords,
} from '@lace-contract/cardano-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { CURRENT_CUSTODY_CONTRACT_VERSION } from '@lace-lib/cardano-custody';
import { describe, expect, it, vi } from 'vitest';

import { openCardanoCustodyAccount } from '../../src/custody/cardano-custody-account-entity';
import {
  createLocalCardanoCustodyDeviceSigner,
  createRemoteCardanoCustodyDeviceSigner,
} from '../../src/custody/cardano-custody-device-signer';
import {
  CardanoCustodyDeviceNotListedError,
  CardanoCustodyInvalidOperationError,
  CardanoCustodyUnsupportedSignerError,
} from '../../src/custody/cardano-custody-errors';
import { signCardanoCustodyData } from '../../src/custody/sign-cardano-custody-data';
import {
  CardanoCustodyDataSignatureError,
  verifyCardanoCustodyDataSignature,
} from '../../src/custody/verify-cardano-custody-data-signature';

import {
  controlOutput,
  createCustodyTestWallet,
  creatorBinding,
  DEVICE_0,
  DEVICE_1,
  fundUtxo,
  hostedChannel,
  identity,
  initialState,
  liveControl,
  localChannel,
  PREPROD,
  record,
  serializeResolvedInput,
  TESTNET_CUSTODY_XPUB,
  utxo,
  words,
} from './custody-fixtures';

import type {
  CardanoCustodyDeviceSigner,
  CardanoCustodyDeviceSignDataRequest,
} from '../../src/custody/cardano-custody-device-signer';
import type { CardanoCustodyDeviceBinding } from '@lace-contract/cardano-context';
import type { PasskeyKeySource } from '@lace-lib/passkey';

/** `Sign in to city.example, nonce 42` in UTF-8. */
const CHALLENGE = HexBlob(
  Buffer.from('Sign in to city.example, nonce 42').toString('hex'),
);
/** The origin of this app, which a local signature binds. */
const APP_ORIGIN = 'https://wallet.example';
/** The origin of the site that asked the hosted signer. */
const SITE_ORIGIN = 'https://city.example';

const keySource = (): PasskeyKeySource => ({
  ensureCredential: vi.fn(),
  credentialRef: vi.fn(() => ({
    ...localChannel,
    recipeVersion: 'v1' as const,
  })),
  withPasskeyMnemonic: async use => use(words),
});

/**
 * A signature by the fixture words' testnet device key at `deviceIndex`,
 * with the origin it binds, as a device signer answers it.
 */
const signByDevice = async (
  deviceIndex: number,
  expectedKeyHash: typeof DEVICE_0,
  {
    payload = CHALLENGE,
    origin = SITE_ORIGIN,
    purpose = 'sign-in',
  }: Partial<
    Pick<CardanoCustodyDeviceSignDataRequest, 'payload' | 'purpose'>
  > & { origin?: string } = {},
) => ({
  ...(await signCardanoCustodyDataWithWords({
    words,
    address: identity.address,
    origin,
    purpose,
    payload,
    deviceIndex,
    expectedKeyHash,
    contractVersion: CURRENT_CUSTODY_CONTRACT_VERSION,
    networkMagic: PREPROD.networkMagic,
  })),
  origin,
});

const setup = async ({
  device = creatorBinding(localChannel),
  settled = [liveControl, fundUtxo],
}: {
  device?: CardanoCustodyDeviceBinding | null;
  settled?: ReturnType<typeof utxo>[];
} = {}) => {
  const test = createCustodyTestWallet();
  const { accountId } = await openCardanoCustodyAccount(test.wallet, {
    record,
    ...(device && { device }),
    name: 'Treasury',
  });
  test.settledUtxos$.next({ [accountId]: settled });
  const local = createLocalCardanoCustodyDeviceSigner({
    keySource: keySource(),
    origin: APP_ORIGIN,
  });
  const deviceSigner = {
    signTransaction: vi.fn(),
    signData: vi.fn(async (request: CardanoCustodyDeviceSignDataRequest) =>
      local.signData(request),
    ),
  };
  const sign = async (
    signer: CardanoCustodyDeviceSigner = deviceSigner,
    purpose: 'link-account' | 'sign-in' = 'sign-in',
  ) =>
    signCardanoCustodyData(test.wallet, {
      accountId,
      payload: CHALLENGE,
      purpose,
      deviceSigner: signer,
    });
  return { ...test, accountId, deviceSigner, sign };
};

describe('signCardanoCustodyData', () => {
  it('signs with the bound device and returns a proof the site verifies for its origin and purpose against the listed devices', async () => {
    const { sign, deviceSigner } = await setup();

    const signed = await sign();

    expect(signed.isOk()).toBe(true);
    const proof = signed.unwrap();
    expect(proof).toMatchObject({
      address: identity.address,
      origin: APP_ORIGIN,
      keyHash: DEVICE_0,
    });
    const verified = await verifyCardanoCustodyDataSignature({
      signature: proof.signature,
      key: proof.key,
      payload: CHALLENGE,
      address: identity.address,
      origin: APP_ORIGIN,
      purpose: 'sign-in',
      devices: initialState.devices,
    });
    expect(verified.unwrap()).toEqual({ keyHash: DEVICE_0 });
    expect(deviceSigner.signData).toHaveBeenCalledWith({
      payload: CHALLENGE,
      purpose: 'sign-in',
      accountRecord: record,
      controlUtxo: liveControl,
      chainId: PREPROD,
      device: creatorBinding(localChannel),
    });
  });

  it('asks a hosted signer with the confirmed control UTxO and the purpose, and returns the origin it bound', async () => {
    const answer = await signByDevice(0, DEVICE_0, {
      purpose: 'link-account',
    });
    const request = vi.fn(async () => answer);
    const { sign } = await setup({ device: creatorBinding(hostedChannel) });

    const signed = await sign(
      createRemoteCardanoCustodyDeviceSigner({ request }),
      'link-account',
    );

    expect(signed.unwrap()).toEqual({
      ...answer,
      address: identity.address,
      origin: SITE_ORIGIN,
      keyHash: DEVICE_0,
    });
    expect(request).toHaveBeenCalledWith('sign-cardano-custody-data', {
      chainId: PREPROD,
      device: { extendedAccountPublicKey: TESTNET_CUSTODY_XPUB, index: 0 },
      accountRecord: record,
      controlUtxo: serializeResolvedInput(liveControl),
      payload: CHALLENGE,
      purpose: 'link-account',
    });
  });

  describe('refuses before the device is asked', () => {
    it('an account the wallet opened as an observer', async () => {
      const { sign, deviceSigner } = await setup({ device: null });

      const signed = await sign();

      expect(signed.isErr() && signed.error).toBeInstanceOf(
        CardanoCustodyInvalidOperationError,
      );
      expect(signed.isErr() && signed.error).toMatchObject({
        reason: 'observer-account',
      });
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it('an account the wallet does not hold', async () => {
      const { wallet, deviceSigner } = await setup();

      const signed = await signCardanoCustodyData(wallet, {
        accountId: AccountId('unknown'),
        payload: CHALLENGE,
        purpose: 'sign-in',
        deviceSigner,
      });

      expect(signed.isErr() && signed.error).toMatchObject({
        reason: 'unknown-account',
      });
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it('an account without a confirmed control state', async () => {
      const { sign, deviceSigner } = await setup({ settled: [fundUtxo] });

      const signed = await sign();

      expect(signed.isErr() && signed.error).toMatchObject({
        reason: 'account-not-live',
        detail: { status: 'notCreated' },
      });
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it("an account whose network's protocol parameters are unknown", async () => {
      const { sign, deviceSigner, networkInfo$ } = await setup();
      networkInfo$.next({});

      const signed = await sign();

      expect(signed.isErr() && signed.error).toMatchObject({
        reason: 'account-not-live',
        detail: { status: 'unsynced' },
      });
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it('an account whose confirmed UTxOs have not synced yet', async () => {
      const { sign, deviceSigner, settledUtxos$ } = await setup();
      settledUtxos$.next({});

      const signed = await sign();

      expect(signed.isErr() && signed.error).toMatchObject({
        reason: 'account-not-live',
        detail: { status: 'unsynced' },
      });
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it('a device the confirmed state does not list', async () => {
      const { sign, deviceSigner } = await setup({
        settled: [
          utxo(
            0x10,
            controlOutput({ ...initialState, devices: [HexBlob(DEVICE_1)] }),
          ),
        ],
      });

      const signed = await sign();

      expect(signed.isErr() && signed.error).toBeInstanceOf(
        CardanoCustodyDeviceNotListedError,
      );
      expect(deviceSigner.signData).not.toHaveBeenCalled();
    });

    it('a device signer that cannot sign data', async () => {
      const { sign } = await setup();

      const signed = await sign({ signTransaction: vi.fn() });

      expect(signed.isErr() && signed.error).toBeInstanceOf(
        CardanoCustodyUnsupportedSignerError,
      );
    });
  });

  it('refuses a signature by another listed device than the bound one', async () => {
    const { sign } = await setup({
      settled: [
        utxo(
          0x10,
          controlOutput({
            ...initialState,
            devices: [HexBlob(DEVICE_0), HexBlob(DEVICE_1)],
          }),
        ),
      ],
    });
    const otherDevice = await signByDevice(1, DEVICE_1);

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => otherDevice),
    });

    expect(signed.isErr() && signed.error).toBeInstanceOf(
      CardanoCustodyDataSignatureError,
    );
    expect(signed.isErr() && signed.error).toMatchObject({
      reason: 'unexpected-key',
      detail: { keyHash: DEVICE_1 },
    });
  });

  it('refuses a signature over another payload', async () => {
    const { sign } = await setup();
    const otherPayload = await signByDevice(0, DEVICE_0, {
      payload: HexBlob('00'),
    });

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => otherPayload),
    });

    expect(signed.isErr() && signed.error).toMatchObject({
      reason: 'payload-mismatch',
    });
  });

  it('refuses a signature for another purpose than the one asked for', async () => {
    const { sign } = await setup();
    const linked = await signByDevice(0, DEVICE_0, {
      purpose: 'link-account',
    });

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => linked),
    });

    expect(signed.isErr() && signed.error).toMatchObject({
      reason: 'purpose-mismatch',
    });
  });

  it('refuses a signature that binds another origin than the signer reports', async () => {
    const { sign } = await setup();
    const relayed = await signByDevice(0, DEVICE_0, {
      origin: 'https://evil.example',
    });

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => ({ ...relayed, origin: SITE_ORIGIN })),
    });

    expect(signed.isErr() && signed.error).toMatchObject({
      reason: 'origin-mismatch',
    });
  });

  it('answers a signer refusal as the error, without rejecting', async () => {
    const refusal = new CardanoCustodyRequestRefusedError(
      'custody-device-not-listed',
      'not-listed',
    );
    const { sign } = await setup();

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => {
        throw refusal;
      }),
    });

    expect(signed.isErr() && signed.error).toBe(refusal);
  });

  it('answers a thrown value that is not an error as an error', async () => {
    const { sign } = await setup();

    const signed = await sign({
      signTransaction: vi.fn(),
      signData: vi.fn(async () => {
        const notAnError: unknown = 'declined';
        throw notAnError;
      }),
    });

    expect(signed.isErr() && signed.error).toEqual(new Error('declined'));
  });
});
