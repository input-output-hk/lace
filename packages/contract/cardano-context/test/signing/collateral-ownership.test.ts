import { Cardano } from '@cardano-sdk/core';
import { describe, expect, it, vi } from 'vitest';

import {
  collateralOwnershipSets,
  collateralRefusalCase,
  resolveCollateralOwnershipSets,
} from '../../src/signing/collateral-ownership';

import type { CollateralOwnershipErrorCase } from '../../src/signing/assert-collateral-ownership';
import type * as Crypto from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

const txIn = (id: string, index: number): Cardano.TxIn =>
  ({ txId: id, index } as unknown as Cardano.TxIn);

const refKey = (id: string, index: number) => `${id}#${index}`;

const addr = (label: string) => `addr_test1${label}` as Cardano.PaymentAddress;

const WALLET_RETURN = addr('wallet-return');

const txOut = (address: Cardano.PaymentAddress): Cardano.TxOut =>
  ({ address, value: { coins: 2_000_000n } } as unknown as Cardano.TxOut);

const body = (fields: Partial<Cardano.TxBody>): Cardano.TxBody =>
  ({
    inputs: [],
    outputs: [],
    fee: 170_000n,
    ...fields,
  } as unknown as Cardano.TxBody);

const keyCred = (byte: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: byte.repeat(28) as Crypto.Hash28ByteBase16,
});
const base = (payment: string, stake: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    keyCred(payment),
    keyCred(stake),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

const WALLET = base('aa', 'bb');
const WALLET_PAYMENT_FOREIGN_STAKE = base('aa', 'cc');
const FOREIGN = base('dd', 'ee');
const knownAddresses = [{ address: WALLET } as unknown as GroupedAddress];

/**
 * K: identified as ours. F: identified as someone else's. U: not identifiable,
 * the resolver answers null. T: not identifiable, the resolver throws.
 * Membership cannot tell F, U and T apart; the resolver can, and the verdict
 * must not change.
 */
type Kind = 'F' | 'K' | 'T' | 'U';
type Return = 'foreign' | 'none' | 'own';
const REFUSE: CollateralOwnershipErrorCase = 'foreign-collateral-return';

type Row = {
  collateral: Kind[];
  ret: Return;
  verdict: CollateralOwnershipErrorCase | null;
};

const ROWS: Row[] = [
  { collateral: ['K'], ret: 'own', verdict: null },
  { collateral: ['K'], ret: 'foreign', verdict: REFUSE },
  { collateral: ['K', 'K', 'K'], ret: 'foreign', verdict: REFUSE },
  { collateral: ['K', 'U'], ret: 'own', verdict: null },
  { collateral: ['K', 'F'], ret: 'own', verdict: null },
  { collateral: ['K', 'T'], ret: 'own', verdict: null },
  { collateral: ['K', 'U'], ret: 'foreign', verdict: REFUSE },
  { collateral: ['K', 'F'], ret: 'foreign', verdict: REFUSE },
  { collateral: ['K', 'T'], ret: 'foreign', verdict: REFUSE },
  { collateral: ['K'], ret: 'none', verdict: null },
  { collateral: ['K', 'U'], ret: 'none', verdict: null },
  { collateral: ['K', 'F'], ret: 'none', verdict: null },
  { collateral: ['U'], ret: 'own', verdict: null },
  { collateral: ['U'], ret: 'foreign', verdict: null },
  { collateral: ['F'], ret: 'own', verdict: null },
  { collateral: ['F'], ret: 'foreign', verdict: null },
  { collateral: ['T'], ret: 'foreign', verdict: null },
  { collateral: ['U', 'F'], ret: 'foreign', verdict: null },
  { collateral: [], ret: 'foreign', verdict: null },
  { collateral: [], ret: 'none', verdict: null },
];

const MATRIX = ROWS.map(row => ({
  ...row,
  label: `${row.collateral.join('+') || 'no collateral'}, return ${row.ret}`,
}));

const classify = (kinds: Kind[]) =>
  kinds.map((kind, index) => ({ kind, input: txIn(`${kind}${index}`, index) }));

const bodyOf = (
  collaterals: ReturnType<typeof classify>,
  returnValue: Return,
): Cardano.TxBody =>
  body({
    collaterals: collaterals.map(({ input }) => input),
    ...(returnValue === 'none'
      ? {}
      : { collateralReturn: txOut(returnValue === 'own' ? WALLET : FOREIGN) }),
  });

const identifiedKeys = (collaterals: ReturnType<typeof classify>) =>
  collaterals
    .filter(({ kind }) => kind === 'K')
    .map(({ input }) => refKey(input.txId, input.index))
    .sort();

describe('the rule over the membership authority (pre-consent)', () => {
  it.each(MATRIX)('$label -> $verdict', ({ collateral, ret, verdict }) => {
    const collaterals = classify(collateral);
    const sets = collateralOwnershipSets({
      ownershipUtxos: collaterals
        .filter(({ kind }) => kind === 'K')
        .map(({ input }) => [input, txOut(WALLET)] as unknown as Cardano.Utxo),
      knownAddresses,
    });

    expect([...sets.ownUtxoRefs].sort()).toEqual(identifiedKeys(collaterals));
    expect(collateralRefusalCase(bodyOf(collaterals, ret), sets)).toBe(verdict);
  });
});

describe('the rule over the resolver authority (signing boundary)', () => {
  it.each(MATRIX)(
    '$label -> $verdict',
    async ({ collateral, ret, verdict }) => {
      const collaterals = classify(collateral);
      const txBody = bodyOf(collaterals, ret);
      const sets = await resolveCollateralOwnershipSets({
        body: txBody,
        resolveInput: async input => {
          const { kind } = collaterals.find(
            c =>
              refKey(c.input.txId, c.input.index) ===
              refKey(input.txId, input.index),
          )!;
          switch (kind) {
            case 'K':
              return txOut(WALLET);
            case 'F':
              return txOut(FOREIGN);
            case 'U':
              return null;
            case 'T':
              throw new Error('provider down');
          }
        },
        knownAddresses,
      });

      expect([...sets.ownUtxoRefs].sort()).toEqual(identifiedKeys(collaterals));
      expect(collateralRefusalCase(txBody, sets)).toBe(verdict);
    },
  );
});

describe('payment-credential reuse', () => {
  it('a base collateral_return sharing the wallet payment credential with a FOREIGN stake credential is refused (strict full-address match, never payment-credential match)', () => {
    const paymentCred: Cardano.Credential = {
      type: Cardano.CredentialType.KeyHash,
      hash: 'aa'.repeat(28) as Crypto.Hash28ByteBase16,
    };
    const walletStakeCred: Cardano.Credential = {
      type: Cardano.CredentialType.KeyHash,
      hash: 'bb'.repeat(28) as Crypto.Hash28ByteBase16,
    };
    const foreignStakeCred: Cardano.Credential = {
      type: Cardano.CredentialType.KeyHash,
      hash: 'cc'.repeat(28) as Crypto.Hash28ByteBase16,
    };

    const walletAddress = Cardano.BaseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      paymentCred,
      walletStakeCred,
    )
      .toAddress()
      .toBech32() as Cardano.PaymentAddress;

    const attackerAddress = Cardano.BaseAddress.fromCredentials(
      Cardano.NetworkId.Testnet,
      paymentCred,
      foreignStakeCred,
    )
      .toAddress()
      .toBech32() as Cardano.PaymentAddress;

    // Fixture sanity: same payment credential, different full address -- a
    // payment-credential-matching implementation (getUniqueSigners.ts's
    // model, explicitly rejected for this check) would wrongly treat these
    // as the same owner.
    expect(attackerAddress).not.toEqual(walletAddress);
    expect(
      Cardano.Address.fromBech32(attackerAddress)
        .asBase()!
        .getPaymentCredential().hash,
    ).toEqual(
      Cardano.Address.fromBech32(walletAddress).asBase()!.getPaymentCredential()
        .hash,
    );

    const own = txIn('t1', 0);
    const result = collateralRefusalCase(
      body({ collaterals: [own], collateralReturn: txOut(attackerAddress) }),
      {
        ownUtxoRefs: new Set([refKey('t1', 0)]),
        ownAddresses: new Set([walletAddress]),
      },
    );

    expect(result).toBe('foreign-collateral-return');
  });
});

describe('transactions with no collateral', () => {
  it('no collaterals field -> allow, no throw', () => {
    const result = collateralRefusalCase(body({}), {
      ownUtxoRefs: new Set(),
      ownAddresses: new Set(),
    });
    expect(result).toBeNull();
  });

  it('empty collaterals array -> allow (an unguarded dereference would fail-closed-block ALL ordinary signing)', () => {
    const result = collateralRefusalCase(body({ collaterals: [] }), {
      ownUtxoRefs: new Set(),
      ownAddresses: new Set(),
    });
    expect(result).toBeNull();
  });
});

/**
 * `ownAddresses` is built from DISCOVERED addresses, so an undiscovered
 * address of this very wallet reads as foreign. Pinned as an accepted
 * trade-off (refusing a legitimate transaction beats signing a hostile one),
 * so a future change to address discovery cannot move it silently.
 */
describe('the accepted false positive', () => {
  it('refuses a collateral_return paying an OWN but not-yet-derived address', () => {
    const own = txIn('t1', 0);
    const notYetDerived = addr('own-but-undiscovered');

    expect(
      collateralRefusalCase(
        body({ collaterals: [own], collateralReturn: txOut(notYetDerived) }),
        {
          ownUtxoRefs: new Set([refKey('t1', 0)]),
          // The wallet owns `notYetDerived`; discovery has not reached it.
          ownAddresses: new Set([WALLET_RETURN]),
        },
      ),
    ).toBe('foreign-collateral-return');
  });
});

describe('assembling the ownership authority', () => {
  const utxo = (id: string, index: number): Cardano.Utxo =>
    [txIn(id, index), txOut(WALLET_RETURN)] as unknown as Cardano.Utxo;

  it('keys UTxOs the way the rule reads them, and addresses in full', () => {
    const sets = collateralOwnershipSets({
      ownershipUtxos: [utxo('t1', 3)],
      knownAddresses: [{ address: WALLET_RETURN } as unknown as GroupedAddress],
    });

    expect(
      collateralRefusalCase(
        body({
          collaterals: [txIn('t1', 3)],
          collateralReturn: txOut(WALLET_RETURN),
        }),
        sets,
      ),
    ).toBeNull();
    expect(sets.ownUtxoRefs.has(refKey('t1', 3))).toBe(true);
    expect(sets.ownAddresses.has(WALLET_RETURN)).toBe(true);
  });
});

describe('resolving the ownership authority at the signing boundary', () => {
  const resolverOver =
    (entries: Record<string, Cardano.PaymentAddress>) =>
    async (input: Cardano.TxIn) => {
      const address = entries[refKey(input.txId, input.index)];
      return address ? txOut(address) : null;
    };

  it('an input resolved to a wallet address is own; one resolved to a foreign address is not', async () => {
    const sets = await resolveCollateralOwnershipSets({
      body: body({ collaterals: [txIn('t1', 0), txIn('t2', 0)] }),
      resolveInput: resolverOver({
        [refKey('t1', 0)]: WALLET,
        [refKey('t2', 0)]: FOREIGN,
      }),
      knownAddresses,
    });

    expect([...sets.ownUtxoRefs]).toEqual([refKey('t1', 0)]);
    expect(sets.ownAddresses).toEqual(new Set([WALLET]));
  });

  it('INPUT ownership is by payment credential: a UTxO at the wallet payment key with a foreign stake key is own, because our witness would satisfy it', async () => {
    const sets = await resolveCollateralOwnershipSets({
      body: body({ collaterals: [txIn('t1', 0)] }),
      resolveInput: resolverOver({
        [refKey('t1', 0)]: WALLET_PAYMENT_FOREIGN_STAKE,
      }),
      knownAddresses,
    });

    expect(sets.ownUtxoRefs.has(refKey('t1', 0))).toBe(true);
  });

  it('RETURN ownership stays whole-address: the same wallet-payment/foreign-stake address as a return is refused', async () => {
    const collateral = txIn('t1', 0);
    const sets = await resolveCollateralOwnershipSets({
      body: body({ collaterals: [collateral] }),
      resolveInput: resolverOver({ [refKey('t1', 0)]: WALLET }),
      knownAddresses,
    });

    expect(
      collateralRefusalCase(
        body({
          collaterals: [collateral],
          collateralReturn: txOut(WALLET_PAYMENT_FOREIGN_STAKE),
        }),
        sets,
      ),
    ).toBe('foreign-collateral-return');
  });

  it('a transaction without collateral never calls the resolver', async () => {
    const resolveInput = vi.fn(async () => null);

    const sets = await resolveCollateralOwnershipSets({
      body: body({}),
      resolveInput,
      knownAddresses,
    });

    expect(resolveInput).not.toHaveBeenCalled();
    expect(sets.ownUtxoRefs.size).toBe(0);
  });
});
