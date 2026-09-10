/**
 * @vitest-environment jsdom
 */
import { BitcoinNetworkId } from '@lace-contract/bitcoin-context';
import { AccountId } from '@lace-contract/wallet-repo';
import { renderHook } from '@testing-library/react';
import * as bitcoin from 'bitcoinjs-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSignPsbtData } from '../../src/hooks/useSignPsbtData';

import type { ResolvedInputs } from '../../src/store/slice';
import type { PendingSignPsbtRequest } from '../../src/store/slice';
import type { AnyAddress } from '@lace-contract/addresses';

const mocks = vi.hoisted(() => ({
  selectors: {} as Record<string, unknown>,
}));

vi.mock('../../src/hooks/storeHooks', () => ({
  useLaceSelector: (key: string) => mocks.selectors[key],
}));

const network = bitcoin.networks.bitcoin;
const ownPayment = bitcoin.payments.p2wpkh({
  hash: Buffer.alloc(20, 1),
  network,
});
const otherAccountPayment = bitcoin.payments.p2wpkh({
  hash: Buffer.alloc(20, 2),
  network,
});
const OWN_TXID = 'ab'.repeat(32);
const OTHER_TXID = 'cd'.repeat(32);

const DAPP_ORIGIN = 'https://dapp.example';
const REQUEST_ACCOUNT_ID = AccountId('bitcoin-account-0');
const OTHER_ACCOUNT_ID = AccountId('bitcoin-account-1');

const buildValidPsbt = () => {
  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({
    hash: OWN_TXID,
    index: 0,
    witnessUtxo: { script: ownPayment.output!, value: 50_000 },
  });
  psbt.addOutput({ address: ownPayment.address!, value: 40_000 });
  return psbt.toBase64();
};

/**
 * Spends one input of each account of the wallet and pays each account back,
 * so the own set decides both the Own tags and the balance change: scoped to
 * the request's account the change is -10_000, wallet-wide it would be -5000.
 */
const buildTwoAccountPsbt = () => {
  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({
    hash: OWN_TXID,
    index: 0,
    witnessUtxo: { script: ownPayment.output!, value: 50_000 },
  });
  psbt.addInput({
    hash: OTHER_TXID,
    index: 1,
    witnessUtxo: { script: otherAccountPayment.output!, value: 30_000 },
  });
  psbt.addOutput({ address: ownPayment.address!, value: 40_000 });
  psbt.addOutput({ address: otherAccountPayment.address!, value: 35_000 });
  return psbt.toBase64();
};

/** Spends an input the PSBT carries no previous output for, so its owner stays
 * unknown until the resolved-inputs side effect supplies it. */
const buildUnresolvedInputPsbt = () => {
  const psbt = new bitcoin.Psbt({ network });
  psbt.addInput({ hash: OWN_TXID, index: 0 });
  psbt.addOutput({ address: ownPayment.address!, value: 40_000 });
  return psbt.toBase64();
};

const validPsbtBase64 = buildValidPsbt();
const twoAccountPsbtBase64 = buildTwoAccountPsbt();
const unresolvedInputPsbtBase64 = buildUnresolvedInputPsbt();
const undecodablePsbtBase64 = Buffer.from('garbage bytes').toString('base64');

const createAddress = (address: string, accountId: AccountId): AnyAddress =>
  ({ address, accountId, blockchainName: 'Bitcoin' } as unknown as AnyAddress);

const buildRequest = (
  psbtsBase64: string[],
  overrides: Partial<PendingSignPsbtRequest> = {},
): PendingSignPsbtRequest => ({
  requestId: 'req-1',
  dappOrigin: DAPP_ORIGIN,
  dapp: { name: 'Test DApp', origin: DAPP_ORIGIN },
  psbtsBase64,
  currentIndex: 0,
  accountId: REQUEST_ACCOUNT_ID,
  ...overrides,
});

const setSelectors = (overrides: {
  activeNetworkId?: unknown;
  resolvedInputs?: ResolvedInputs;
}) => {
  mocks.selectors = {
    'addresses.selectAllAddresses': [
      createAddress(ownPayment.address!, REQUEST_ACCOUNT_ID),
      createAddress(otherAccountPayment.address!, OTHER_ACCOUNT_ID),
    ],
    'network.selectActiveNetworkId':
      'activeNetworkId' in overrides
        ? overrides.activeNetworkId
        : BitcoinNetworkId('mainnet'),
    'bitcoinDappConnector.selectResolvedInputs': overrides.resolvedInputs ?? {
      status: 'resolved',
      prevOuts: {},
    },
  };
};

describe('useSignPsbtData', () => {
  beforeEach(() => {
    setSelectors({});
  });

  it('returns a defined inspection and no error for a decodable PSBT once inputs are resolved', () => {
    const request = buildRequest([validPsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(false);
    expect(result.current.isResolvingInputs).toBe(false);
    expect(result.current.inspection).toBeDefined();
  });

  it('tags only the request account addresses as own', () => {
    const request = buildRequest([twoAccountPsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(
      result.current.inspection?.inputs.map(input => [
        input.address,
        input.isOwn,
      ]),
    ).toEqual([
      [ownPayment.address, true],
      [otherAccountPayment.address, false],
    ]);
    expect(
      result.current.inspection?.outputs.map(output => [
        output.address,
        output.isOwn,
      ]),
    ).toEqual([
      [ownPayment.address, true],
      [otherAccountPayment.address, false],
    ]);
  });

  it('counts only the request account values into the balance change', () => {
    const request = buildRequest([twoAccountPsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.inspection?.netBalanceChange).toBe(-10_000);
  });

  it('warns about foreign inputs when the dApp asks to sign another account input', () => {
    const request = buildRequest([twoAccountPsbtBase64], {
      options: { toSignInputs: [{ index: 0 }, { index: 1 }] },
    });

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.inspection?.warnings.signsForeignInputs).toBe(true);
  });

  it('errors instead of inspecting over an empty own set when the request carries no account', () => {
    const request = buildRequest([twoAccountPsbtBase64], {
      accountId: undefined,
    });

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(true);
    expect(result.current.inspection).toBeUndefined();
  });

  it('errors for a request without an account even when the dApp named inputs to sign', () => {
    const request = buildRequest([twoAccountPsbtBase64], {
      accountId: undefined,
      options: { toSignInputs: [{ index: 0 }] },
    });

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(true);
    expect(result.current.inspection).toBeUndefined();
  });

  it('keeps showing the loading state for a request without an account while inputs resolve', () => {
    setSelectors({ resolvedInputs: { status: 'resolving', prevOuts: {} } });
    const request = buildRequest([twoAccountPsbtBase64], {
      accountId: undefined,
    });

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(false);
    expect(result.current.isResolvingInputs).toBe(true);
  });

  it('warns that input values are unverified while an input stays unresolved', () => {
    const request = buildRequest([unresolvedInputPsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.inspection?.warnings.unresolvedInputValues).toBe(
      true,
    );
    expect(result.current.inspection?.inputs[0]?.address).toBeUndefined();
  });

  it('tags a resolved input as own when it spends a request account address', () => {
    setSelectors({
      resolvedInputs: {
        status: 'resolved',
        prevOuts: {
          [`${OWN_TXID}:0`]: {
            value: 50_000,
            scriptHex: ownPayment.output!.toString('hex'),
          },
        },
      },
    });
    const request = buildRequest([unresolvedInputPsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.inspection?.inputs[0]).toMatchObject({
      address: ownPayment.address,
      isOwn: true,
      value: 50_000,
    });
    expect(result.current.inspection?.warnings.unresolvedInputValues).toBe(
      false,
    );
  });

  it('flags an undecodable PSBT as an error once inputs are done resolving', () => {
    const request = buildRequest([undecodablePsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(true);
    expect(result.current.inspection).toBeUndefined();
  });

  it('does not flag an error for an undecodable PSBT while inputs are still resolving', () => {
    setSelectors({ resolvedInputs: { status: 'resolving', prevOuts: {} } });
    const request = buildRequest([undecodablePsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(false);
    expect(result.current.isResolvingInputs).toBe(true);
    expect(result.current.inspection).toBeUndefined();
  });

  it('does not flag an error for an undecodable PSBT while inputs are idle', () => {
    setSelectors({ resolvedInputs: { status: 'idle', prevOuts: {} } });
    const request = buildRequest([undecodablePsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(false);
    expect(result.current.isResolvingInputs).toBe(true);
  });

  it('does not flag an error for an undecodable PSBT while the active network is unknown', () => {
    setSelectors({ activeNetworkId: undefined });
    const request = buildRequest([undecodablePsbtBase64]);

    const { result } = renderHook(() => useSignPsbtData(request));

    expect(result.current.hasError).toBe(false);
    expect(result.current.inspection).toBeUndefined();
  });

  it('does not flag an error when there is no pending request', () => {
    const { result } = renderHook(() => useSignPsbtData(null));

    expect(result.current.hasError).toBe(false);
    expect(result.current.inspection).toBeUndefined();
    expect(result.current.currentPsbtBase64).toBe('');
  });
});
