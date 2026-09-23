import { Cardano, Serialization } from '@cardano-sdk/core';
import { withCollateralOwnershipGuard } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { signSweepTxWithDevice } from '../../../src/store/side-effects/sign-sweep-tx';

import type {
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';

const cred = (hash: string): Cardano.Credential => ({
  type: Cardano.CredentialType.KeyHash,
  hash: hash as never,
});

const addressOf = (paymentHash: string, stakeHash: string) =>
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Testnet,
    cred(paymentHash),
    cred(stakeHash),
  )
    .toAddress()
    .toBech32() as Cardano.PaymentAddress;

// Two accounts of ONE wallet, both inside the same ReviewedSweepPlan.
const ACCOUNT_A_ADDRESS = addressOf('aa'.repeat(28), 'bb'.repeat(28));
const ACCOUNT_B_ADDRESS = addressOf('cc'.repeat(28), 'dd'.repeat(28));
// Nobody's in this wallet.
const FOREIGN_ADDRESS = addressOf('ee'.repeat(28), 'ff'.repeat(28));

const txId = (byte: string) => byte.repeat(32) as Cardano.TransactionId;
const A_INPUT: Cardano.TxIn = { txId: txId('11'), index: 0 };
const A_COLLATERAL: Cardano.TxIn = { txId: txId('22'), index: 0 };
const B_COLLATERAL: Cardano.TxIn = { txId: txId('33'), index: 0 };

const utxo = (txIn: Cardano.TxIn, address: Cardano.PaymentAddress) =>
  [txIn, { address, value: { coins: 5_000_000n } }] as Cardano.Utxo;

/** The flat union `signSweepTxWithDevice` receives: every account's UTxOs. */
const SWEEP_UTXOS = [
  utxo(A_INPUT, ACCOUNT_A_ADDRESS),
  utxo(A_COLLATERAL, ACCOUNT_A_ADDRESS),
  utxo(B_COLLATERAL, ACCOUNT_B_ADDRESS),
];

const txWith = (
  collaterals: Cardano.TxIn[],
  collateralReturnAddress: Cardano.PaymentAddress = ACCOUNT_A_ADDRESS,
) =>
  Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(
      Serialization.Transaction.fromCore({
        id: txId('ef'),
        body: {
          inputs: [A_INPUT],
          outputs: [{ address: ACCOUNT_A_ADDRESS, value: { coins: 1n } }],
          fee: 170_000n,
          collaterals,
          collateralReturn: {
            address: collateralReturnAddress,
            value: { coins: 4_000_000n },
          },
        },
        witness: { signatures: new Map() },
      } as Cardano.Tx).toCbor(),
    ),
  );

const account = (accountIndex: number) => ({
  accountId: `acct-${accountIndex}` as never,
  accountIndex,
  extendedAccountPublicKey: `xpub-${accountIndex}` as never,
});

const addresses = [
  {
    accountIndex: 0,
    address: ACCOUNT_A_ADDRESS,
    rewardAccount: 'stake-0',
  },
  {
    accountIndex: 1,
    address: ACCOUNT_B_ADDRESS,
    rewardAccount: 'stake-1',
  },
] as never;

const run = (
  tx: Serialization.Transaction,
  innerSign: CardanoTransactionSigner['sign'],
) => {
  const contexts: CardanoTransactionSignerContext[] = [];
  const result$ = signSweepTxWithDevice(
    {
      wallet: {
        blockchainSpecific: { Cardano: { encryptedRootPrivateKey: 'root' } },
      } as never,
      signingAccounts: [account(0), account(1)],
      addresses,
      utxos: SWEEP_UTXOS,
      dependencies: {
        authenticate: vi.fn(() => of(true)),
        accessAuthSecret: vi.fn((use: (s: unknown) => unknown) =>
          use({ secret: true }),
        ),
        logger: {
          warn: vi.fn(),
          error: vi.fn(),
          info: vi.fn(),
          debug: vi.fn(),
        },
        signerFactory: {
          canSign: vi.fn().mockReturnValue(true),
          createDataSigner: vi.fn(),
          createTransactionSigner: (
            context: CardanoTransactionSignerContext,
          ) => {
            contexts.push(context);
            return withCollateralOwnershipGuard({ sign: innerSign }, context);
          },
        },
      } as never,
    },
    tx,
  );
  return { result$, contexts };
};

const signedBy = () =>
  vi.fn(() =>
    of({
      serializedTx: HexBytes(
        Serialization.Transaction.fromCore({
          id: txId('ef'),
          body: {
            inputs: [A_INPUT],
            outputs: [{ address: ACCOUNT_A_ADDRESS, value: { coins: 1n } }],
            fee: 170_000n,
          },
          witness: { signatures: new Map() },
        } as Cardano.Tx).toCbor(),
      ),
      signatureCount: 1,
    }),
  );

// The sweep origin scopes its ownership authority by hand, out of a UTxO union
// spanning EVERY account in the plan, and it has no provider: that scoped set
// is the collateral resolver's only layer. A sibling account's collateral is
// not identifiable here, and does not matter while the return is ours; the
// signing account's own collateral is enough to refuse a foreign return.
describe('signSweepTxWithDevice scopes the collateral resolver to the signing account', () => {
  it('resolves the signing account UTxOs and nothing of a sibling account', async () => {
    const { result$, contexts } = run(
      txWith([A_COLLATERAL]),
      signedBy() as never,
    );
    await firstValueFrom(result$);

    const resolver = contexts[0].collateralInputResolver;
    await expect(resolver.resolveInput(A_INPUT)).resolves.toEqual(
      utxo(A_INPUT, ACCOUNT_A_ADDRESS)[1],
    );
    await expect(resolver.resolveInput(A_COLLATERAL)).resolves.toEqual(
      utxo(A_COLLATERAL, ACCOUNT_A_ADDRESS)[1],
    );
    await expect(resolver.resolveInput(B_COLLATERAL)).resolves.toBeNull();
  });

  it('signs a same-wallet mix returned to the signing account: the sibling collateral is not identifiable here and the return is ours', async () => {
    const innerSign = signedBy();
    const { result$ } = run(
      txWith([A_COLLATERAL, B_COLLATERAL]),
      innerSign as never,
    );

    await firstValueFrom(result$);

    expect(innerSign).toHaveBeenCalled();
  });

  it('refuses the same mix returned to a FOREIGN address: the signing account owns one collateral input, so the return must be ours', async () => {
    const innerSign = signedBy();
    const { result$ } = run(
      txWith([A_COLLATERAL, B_COLLATERAL], FOREIGN_ADDRESS),
      innerSign as never,
    );

    await expect(firstValueFrom(result$)).rejects.toThrow(
      /an address this wallet doesn't own/,
    );
    expect(innerSign).not.toHaveBeenCalled();
  });

  it('control: signs when every collateral input belongs to the signing account and returns to it', async () => {
    const innerSign = signedBy();
    const { result$ } = run(txWith([A_COLLATERAL]), innerSign as never);

    await firstValueFrom(result$);

    expect(innerSign).toHaveBeenCalled();
  });
});
