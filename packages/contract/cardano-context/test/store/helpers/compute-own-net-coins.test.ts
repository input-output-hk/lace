import {
  Cardano,
  createTxInspector,
  transactionSummaryInspector,
} from '@cardano-sdk/core';
import * as Crypto from '@cardano-sdk/crypto';
import { dummyLogger } from 'ts-log';
import { describe, expect, it } from 'vitest';

import { computeOwnNetCoins } from '../../../src/store/helpers/compute-own-net-coins';

import type { Milliseconds } from '@cardano-sdk/core';

const ADA = (amount: number) => BigInt(amount) * 1_000_000n;

const OWN_A = Cardano.PaymentAddress(
  'addr_test1qrr7pflnkppvp49sl2hjs9v255ydycp8zxuxzfjw03vev9ns6cdlwymh7v9kr8cd8cy5vx8l7h6v9da84ml2cjd90fusnjsh8d',
);
const OWN_B = Cardano.PaymentAddress(
  'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
);
const FOREIGN = Cardano.PaymentAddress(
  'addr_test1wpnlxv2xv9a9ucvnvzqakwepzl9ltx7jzgm53av2e9ncv4sysemm8',
);
const OWN_ADDRESSES = [OWN_A, OWN_B];

const REWARD_ACCOUNT = Cardano.RewardAccount(
  'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
);
const FOREIGN_REWARD_ACCOUNT = Cardano.RewardAccount.fromCredential(
  { hash: Crypto.Hash28ByteBase16('aa'.repeat(28)), type: 0 },
  Cardano.RewardAccount.toNetworkId(REWARD_ACCOUNT),
);
const ownStakeCredential = {
  hash: Cardano.RewardAccount.toHash(REWARD_ACCOUNT),
  type: 0 as const,
};
const foreignStakeCredential = {
  hash: Crypto.Hash28ByteBase16('bb'.repeat(28)),
  type: 0 as const,
};

const PROTOCOL_PARAMETERS = {
  poolDeposit: 500_000_000,
  stakeKeyDeposit: 2_000_000,
};
const INSPECTOR_TIMEOUT = 50 as Milliseconds;

const txId = (seed: number) =>
  Cardano.TransactionId(String(seed).repeat(64).slice(0, 64));

type Utxo = {
  txId: Cardano.TransactionId;
  index: number;
  address: Cardano.PaymentAddress;
  value: { coins: bigint };
};

const utxo = (
  seed: number,
  coins: bigint,
  address: Cardano.PaymentAddress,
): Utxo => ({ txId: txId(seed), index: 0, address, value: { coins } });

const atIndex = (input: Utxo, index: number): Utxo => ({ ...input, index });

const output = (coins: bigint, address: Cardano.PaymentAddress) => ({
  address,
  value: { coins },
});

const outpointOf = ({
  txId: id,
  index,
}: {
  txId: Cardano.TransactionId;
  index: number;
}) => `${id}#${index}`;

type TxSpec = {
  inputs: Utxo[];
  outputs: ReturnType<typeof output>[];
  fee: bigint;
  certificates?: Cardano.HydratedCertificate[];
  withdrawals?: Cardano.Withdrawal[];
  donation?: bigint;
};

const buildTx = (spec: TxSpec) =>
  ({
    id: txId(9),
    body: {
      inputs: spec.inputs.map(({ txId: id, index, address }) => ({
        txId: id,
        index,
        address,
      })),
      outputs: spec.outputs,
      fee: spec.fee,
      certificates: spec.certificates ?? [],
      withdrawals: spec.withdrawals ?? [],
      donation: spec.donation,
      validityInterval: {},
    },
  } as unknown as Cardano.HydratedTx);

type Faults = {
  /** refused every time, the shape of a persistent 404 */
  unresolvable?: Utxo[];
  /** refused on the first sweep only, the shape of a transient blip */
  unresolvableOnFirstSweep?: Utxo[];
  /** refused on the second sweep only */
  unresolvableOnSecondSweep?: Utxo[];
};

/**
 * Resolves against the transaction's own UTxOs, refusing the outpoints named in
 * the faults. The inspector sweeps `body.inputs` TWICE, independently, so which
 * sweep refuses an outpoint decides which of its two views of the account's
 * input value comes out short.
 */
const faultyInputResolver = (
  spec: TxSpec,
  faults: Faults = {},
): Cardano.InputResolver => {
  const known = new Map(spec.inputs.map(input => [outpointOf(input), input]));
  const refusedOnSweep = new Map<string, number | 'always'>();
  for (const input of faults.unresolvable ?? [])
    refusedOnSweep.set(outpointOf(input), 'always');
  for (const input of faults.unresolvableOnFirstSweep ?? [])
    refusedOnSweep.set(outpointOf(input), 1);
  for (const input of faults.unresolvableOnSecondSweep ?? [])
    refusedOnSweep.set(outpointOf(input), 2);
  const sweepsSoFar = new Map<string, number>();
  return {
    resolveInput: async input => {
      const outpoint = outpointOf(input);
      const sweep = (sweepsSoFar.get(outpoint) ?? 0) + 1;
      sweepsSoFar.set(outpoint, sweep);
      const refused = refusedOnSweep.get(outpoint);
      if (refused === 'always' || refused === sweep) return null;
      return known.get(outpoint) ?? null;
    },
  };
};

const inspect = async (
  tx: Cardano.HydratedTx,
  inputResolver: Cardano.InputResolver,
) => {
  const { summary } = await createTxInspector({
    summary: transactionSummaryInspector({
      addresses: OWN_ADDRESSES,
      rewardAccounts: [REWARD_ACCOUNT],
      inputResolver,
      protocolParameters: PROTOCOL_PARAMETERS,
      assetProvider: { getAssets: async () => [] },
      timeout: INSPECTOR_TIMEOUT,
      logger: dummyLogger,
    }),
  })(tx);
  return summary;
};

/** The net change with every input's value known — the reference the injected faults cannot distort. */
const trueNetCoins = (spec: TxSpec) => {
  const own = new Set<string>(OWN_ADDRESSES);
  const sum = (values: bigint[]) =>
    values.reduce((total, value) => total + value, 0n);
  return (
    sum(
      spec.outputs
        .filter(({ address }) => own.has(address))
        .map(({ value }) => value.coins),
    ) -
    sum(
      (spec.withdrawals ?? [])
        .filter(({ stakeAddress }) => stakeAddress === REWARD_ACCOUNT)
        .map(({ quantity }) => quantity),
    ) -
    sum(
      spec.inputs
        .filter(({ address }) => own.has(address))
        .map(({ value }) => value.coins),
    )
  );
};

const run = async (spec: TxSpec, fault?: Faults) => {
  const tx = buildTx(spec);
  const summary = await inspect(tx, faultyInputResolver(spec, fault));
  return {
    summary,
    truth: trueNetCoins(spec),
    ownNetCoins: computeOwnNetCoins({
      accountAddresses: OWN_ADDRESSES,
      rewardAccount: REWARD_ACCOUNT,
      protocolParameters: PROTOCOL_PARAMETERS,
      txBody: tx.body,
      summary,
    }),
  };
};

const SEND: TxSpec = {
  inputs: [utxo(1, ADA(500), OWN_A)],
  outputs: [output(ADA(100), FOREIGN), output(ADA(399), OWN_A)],
  fee: ADA(1),
};

const RECEIVE: TxSpec = {
  inputs: [utxo(1, ADA(500), FOREIGN)],
  outputs: [output(ADA(100), OWN_A), output(ADA(399), FOREIGN)],
  fee: ADA(1),
};

const ORDER_CLAIM: TxSpec = {
  inputs: [utxo(1, ADA(2), OWN_A), utxo(2, ADA(500), FOREIGN)],
  outputs: [output(ADA(501), OWN_A)],
  fee: ADA(1),
};

describe('computeOwnNetCoins', () => {
  it('reports the net change of a healthy send', async () => {
    const { ownNetCoins, summary, truth } = await run(SEND);

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(summary.coins);
  });

  it('reports the net change of a healthy receive', async () => {
    const { ownNetCoins, summary, truth } = await run(RECEIVE);

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(summary.coins);
  });

  it('reports a send whose own input never resolves as the loss it is', async () => {
    const { ownNetCoins, summary, truth } = await run(SEND, {
      unresolvable: [SEND.inputs[0]],
    });

    expect(summary.coins).toBe(ADA(399));
    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(101));
  });

  it('reports a send whose own input fails only the first resolution sweep', async () => {
    const { ownNetCoins, truth } = await run(SEND, {
      unresolvableOnFirstSweep: [SEND.inputs[0]],
    });

    expect(ownNetCoins).toBe(truth);
  });

  it('reports a send whose own input fails only the second resolution sweep', async () => {
    const { ownNetCoins, summary, truth } = await run(SEND, {
      unresolvableOnSecondSweep: [SEND.inputs[0]],
    });

    expect(summary.coins).toBe(ADA(399));
    expect(ownNetCoins).toBe(truth);
  });

  it('reports a send that consumed several own inputs, none of which resolve', async () => {
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(300), OWN_A), utxo(2, ADA(250), OWN_B)],
      outputs: [output(ADA(500), FOREIGN), output(ADA(49), OWN_A)],
      fee: ADA(1),
    };
    const { ownNetCoins, truth } = await run(spec, {
      unresolvable: spec.inputs,
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(501));
  });

  it('keeps a claim a gain when the counterparty input is the one that fails', async () => {
    // Charging the account for a counterparty's unresolvable input would
    // relabel every order claim, pool exit and DEX sell a send.
    const { ownNetCoins, truth } = await run(ORDER_CLAIM, {
      unresolvable: [ORDER_CLAIM.inputs[1]],
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(499));
  });

  it('keeps a claim a gain when the account’s own input is the one that fails', async () => {
    const { ownNetCoins, truth } = await run(ORDER_CLAIM, {
      unresolvable: [ORDER_CLAIM.inputs[0]],
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(499));
  });

  it('tells an own input from a stranger’s at the same funding transaction', async () => {
    // A payment and its change, both spent later in one claim. Comparing
    // transaction ids alone would read the stranger's unresolvable input as
    // this account's and charge 500 ADA of it against the claim.
    const spec: TxSpec = {
      inputs: [utxo(6, ADA(2), OWN_A), atIndex(utxo(6, ADA(500), FOREIGN), 1)],
      outputs: [output(ADA(501), OWN_A)],
      fee: ADA(1),
    };
    const { ownNetCoins, truth } = await run(spec, {
      unresolvable: [spec.inputs[1]],
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(499));
  });

  it('does not count withdrawn rewards as a gain', async () => {
    // Withdrawing moves coin between two of the account's own buckets, so the
    // 5 ADA withdrawal leaves it 1 ADA of fee down, not 4 ADA up.
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A)],
      outputs: [output(ADA(104), OWN_A)],
      fee: ADA(1),
      withdrawals: [{ stakeAddress: REWARD_ACCOUNT, quantity: ADA(5) }],
    };
    const { ownNetCoins, summary, truth } = await run(spec);

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(1));
    expect(ownNetCoins).toBe(summary.coins);
  });

  it('recovers the loss on a withdrawal whose own input never resolves', async () => {
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A)],
      outputs: [output(ADA(104), OWN_A)],
      fee: ADA(1),
      withdrawals: [{ stakeAddress: REWARD_ACCOUNT, quantity: ADA(5) }],
    };
    const { ownNetCoins, truth } = await run(spec, {
      unresolvable: spec.inputs,
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(1));
  });

  it('leaves a healthy deposit refund a gain', async () => {
    // The 2 ADA refund is not an input the inspector has to resolve.
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A)],
      outputs: [output(ADA(101), OWN_A)],
      fee: ADA(1),
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential: ownStakeCredential,
        } as Cardano.HydratedCertificate,
      ],
    };
    const { ownNetCoins, summary, truth } = await run(spec);

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(1));
    expect(ownNetCoins).toBe(summary.coins);
  });

  it('does not charge the account for a deposit refunded to another party', async () => {
    // The refund is unaccounted coin that is not an unresolved input, so
    // spending it as if it were would overstate this account's loss by 2 ADA.
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A), utxo(2, ADA(50), FOREIGN)],
      outputs: [output(ADA(99), OWN_A), output(ADA(52), FOREIGN)],
      fee: ADA(1),
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential: foreignStakeCredential,
        } as Cardano.HydratedCertificate,
      ],
    };
    const { ownNetCoins, truth } = await run(spec, {
      unresolvable: [spec.inputs[0]],
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(1));
  });

  it('does not charge the account for another party’s reward withdrawal', async () => {
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(10), OWN_A), utxo(2, ADA(500), FOREIGN)],
      outputs: [output(ADA(1000), OWN_A), output(ADA(9), FOREIGN)],
      fee: ADA(1),
      withdrawals: [
        { stakeAddress: FOREIGN_REWARD_ACCOUNT, quantity: ADA(500) },
      ],
    };
    const { ownNetCoins, truth } = await run(spec, {
      unresolvable: [spec.inputs[0]],
    });

    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(990));
  });

  it('falls back to the inspector when own and foreign inputs both fail', async () => {
    // Their aggregate value cannot be split between the two, so the account's
    // share is unknowable and no correction is made.
    const { ownNetCoins, summary } = await run(ORDER_CLAIM, {
      unresolvable: ORDER_CLAIM.inputs,
    });

    expect(ownNetCoins).toBe(summary.coins);
  });

  it.each([
    ['a send', SEND],
    ['a receive', RECEIVE],
    ['an order claim', ORDER_CLAIM],
  ])(
    'stays between the truth and the inspector for every resolution failure on %s',
    async (_name, spec) => {
      const faults: Faults[] = [
        {},
        { unresolvable: spec.inputs },
        { unresolvableOnFirstSweep: spec.inputs },
        { unresolvableOnSecondSweep: spec.inputs },
        ...spec.inputs.map(input => ({ unresolvable: [input] })),
        ...spec.inputs.map(input => ({ unresolvableOnFirstSweep: [input] })),
        ...spec.inputs.map(input => ({ unresolvableOnSecondSweep: [input] })),
      ];

      for (const fault of faults) {
        const { ownNetCoins, summary, truth } = await run(spec, fault);

        expect(ownNetCoins).toBeLessThanOrEqual(summary.coins);
        expect(ownNetCoins).toBeGreaterThanOrEqual(truth);
      }
    },
  );

  it('recovers the loss when an own deposit refund funds part of the transaction', async () => {
    // The 2 ADA refund lands in unaccounted value, so attributing it to another
    // party leaves the account's own unresolvable input 2 ADA short.
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A)],
      outputs: [output(ADA(99), OWN_A)],
      fee: ADA(3),
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential: ownStakeCredential,
        } as Cardano.HydratedCertificate,
      ],
    };
    const { ownNetCoins, summary, truth } = await run(spec, {
      unresolvable: spec.inputs,
    });

    expect(summary.returnedDeposit).toBe(ADA(2));
    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(-ADA(1));
  });

  it('trusts the inspector outright when every input resolved, whatever else is unaccounted for', async () => {
    // A deregistration that locked 4 ADA when `stakeKeyDeposit` now prices the
    // refund at 2. That 2 ADA lands in the unaccounted value even though no
    // input went unresolved.
    const spec: TxSpec = {
      inputs: [utxo(1, ADA(100), OWN_A)],
      outputs: [output(ADA(101), OWN_A)],
      fee: ADA(3),
      certificates: [
        {
          __typename: Cardano.CertificateType.StakeDeregistration,
          stakeCredential: ownStakeCredential,
        } as Cardano.HydratedCertificate,
      ],
    };
    const { ownNetCoins, summary, truth } = await run(spec);

    expect(summary.unresolved.inputs).toEqual([]);
    expect(summary.unresolved.value.coins).toBe(ADA(2));
    expect(ownNetCoins).toBe(summary.coins);
    expect(ownNetCoins).toBe(truth);
    expect(ownNetCoins).toBe(ADA(1));
  });

  it('does not read an unaccounted SHORTFALL as own value the account never spent', async () => {
    // A treasury donation is coin the inspector does not model, so it reports
    // 45 ADA LESS than nothing unaccounted for. The first sweep's resolution of
    // the 50 ADA input is what keeps that shortfall visible rather than masked.
    const resolvedOnce = utxo(1, ADA(50), OWN_A);
    const neverResolved = utxo(2, ADA(5), OWN_A);
    const spec: TxSpec = {
      inputs: [resolvedOnce, neverResolved],
      outputs: [output(ADA(4), OWN_A)],
      fee: ADA(1),
      donation: ADA(50),
    };
    const { ownNetCoins, summary, truth } = await run(spec, {
      unresolvableOnSecondSweep: [resolvedOnce],
      unresolvable: [neverResolved],
    });

    expect(summary.unresolved.value.coins).toBe(-ADA(45));
    expect(summary.coins).toBe(ADA(4));
    expect(ownNetCoins).toBe(-ADA(46));
    expect(ownNetCoins).toBeGreaterThanOrEqual(truth);
  });
});
