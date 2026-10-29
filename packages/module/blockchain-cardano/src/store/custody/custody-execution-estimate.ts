import type { Cardano } from '@cardano-sdk/core';

/**
 * How many times one custody transaction runs each proxy handler, once per
 * script input and mint policy, and the stake script, once per certificate
 * or withdrawal; and the path its single logic run takes.
 */
interface CustodyHandlerRuns {
  readonly device?: number;
  readonly spendWithGrant?: number;
  readonly sweepGrant?: number;
  readonly fund?: number;
  /** The mint of one issued grant: Lace issues one grant per transaction. */
  readonly issueGrants?: number;
  readonly burnGrants?: number;
  readonly createAccount?: number;
  /** The stake script, for a registration, a delegation or a withdrawal. */
  readonly operate?: number;
  /**
   * The logic's path through the transaction: `arrival` for a creation,
   * `owner` for a Device spend and `agent` for a grant spend. Its cost grows
   * with the grants issued and swept and the fund inputs it checks.
   */
  readonly logic?: 'agent' | 'arrival' | 'owner';
}

type ProxyHandler = Exclude<keyof CustodyHandlerRuns, 'logic'>;

/**
 * Net memory units of one run of each handler: the largest figure the
 * budget table of contract b48545f's security review ("Resource
 * exhaustion": `aiken check -D` less each fixture's baseline, over the
 * largest state) gives for a transaction Lace builds, which issues one
 * grant, sweeps at most eight and spends at most twelve funds.
 */
const HANDLER_NET_MEMORY: Readonly<Record<ProxyHandler, number>> = {
  // A Device spend that sweeps eight grants; a revoke runs 0.22 M.
  device: 480_000,
  // Over twelve deposits: 0.34 M over eight and 0.78 M over forty.
  spendWithGrant: 400_000,
  // The last of eight swept grants.
  sweepGrant: 430_000,
  // The last of twelve deposits: 0.16 M of eight and 0.46 M of forty.
  fund: 200_000,
  // One grant, with eight recipients.
  issueGrants: 150_000,
  // Eight burned grants.
  burnGrants: 340_000,
  createAccount: 150_000,
  // A delegation; a withdrawal runs 0.15 M and a registration 0.14 M.
  operate: 160_000,
};

/**
 * Net memory units of the logic run per path, from the same table, and
 * what each issued grant, swept grant and fund input adds: the owner path
 * runs 1.11 M for a revoke, 1.99 M issuing one grant, 1.54 M sweeping one
 * and 1.21 M with a reserve beside the control; the agent path 1.96 M over
 * one deposit and 5.94 M over forty.
 *
 * Summed per transaction they reach at least the review's figures, given
 * in brackets: a creation 0.75 M (0.73 M), a revoke 1.59 M (1.33 M), an
 * issue 2.62 M (2.41 M), a sweep of eight 8.81 M (8.08 M) and an agent
 * spend over eight funds 4.76 M (4.17 M).
 */
const LOGIC_NET_MEMORY = {
  path: { agent: 1_960_000, arrival: 440_000, owner: 1_110_000 },
  issuedGrant: 880_000,
  sweptGrant: 430_000,
  fund: 100_000,
} as const;

/**
 * What one run is expected to cost on chain, as a multiple of its net
 * figure. The runner leaves out decoding the script context, which every
 * run pays and which grows with the transaction. On upstream's devnet with
 * Preprod's parameters (docs/devnet-evidence.md, "Budget comparison") a
 * revoke over the largest state measured 1.74 M against 1.10 M net, a
 * sweep of eight 9.20 M against 8.26 M and an agent spend over twelve
 * deposits 4.28 M. A transaction that measures above the estimate is
 * reseeded once at the measurement.
 */
const CUSTODY_EXECUTION_ESTIMATE_FACTOR = 2;

/**
 * CPU steps the estimate charges per memory unit. Every redeemer of the
 * devnet run measured between 290 and 460 steps per memory unit, the
 * smallest Fund runs at the top of that range; the large logic and proxy
 * runs, which dominate every total, stay below 370.
 */
const CUSTODY_ESTIMATE_STEPS_PER_MEMORY_UNIT = 400;

/**
 * What a reseed adds to the measured execution units, in percent. The
 * measurement already holds the evaluation margin; this one covers the
 * reseeded transaction measuring differently, since a higher fee changes
 * its change output.
 */
const CUSTODY_RESEED_MARGIN_PERCENT = 10;

const withReseedMargin = (units: number): number =>
  Math.ceil((units * (100 + CUSTODY_RESEED_MARGIN_PERCENT)) / 100);

const logicNetMemory = ({
  logic,
  issueGrants = 0,
  sweepGrant = 0,
  fund = 0,
}: CustodyHandlerRuns): number =>
  logic
    ? LOGIC_NET_MEMORY.path[logic] +
      LOGIC_NET_MEMORY.issuedGrant * issueGrants +
      LOGIC_NET_MEMORY.sweptGrant * sweepGrant +
      LOGIC_NET_MEMORY.fund * fund
    : 0;

/**
 * The execution units a transaction that runs `runs` is expected to
 * measure: the handlers' and the logic's net memory units times the
 * estimate factor, and steps in proportion. It is not capped at the
 * per-transaction limit.
 */
export const custodyExecutionEstimate = (
  runs: CustodyHandlerRuns,
): Cardano.ExUnits => {
  const handlers = Object.keys(HANDLER_NET_MEMORY) as ProxyHandler[];
  const netMemory = handlers.reduce(
    (total, handler) =>
      total + HANDLER_NET_MEMORY[handler] * (runs[handler] ?? 0),
    logicNetMemory(runs),
  );
  const memory = netMemory * CUSTODY_EXECUTION_ESTIMATE_FACTOR;
  return { memory, steps: memory * CUSTODY_ESTIMATE_STEPS_PER_MEMORY_UNIT };
};

/**
 * The plan's estimate within the per-transaction limit, which no valid
 * transaction exceeds: what balancing prices a plan's fee at until a
 * reseed.
 */
export const estimateWithinLimit = (
  estimate: Cardano.ExUnits,
  limit: Cardano.ExUnits,
): Cardano.ExUnits => ({
  memory: Math.min(estimate.memory, limit.memory),
  steps: Math.min(estimate.steps, limit.steps),
});

/**
 * What a build whose scripts measured above its seed learned for the next
 * selection round of the same operation.
 */
export interface CustodyReseed {
  /** The measured units summed, and at least the seed they exceeded. */
  readonly measured: Cardano.ExUnits;
  /** How many redeemers the measured transaction carried. */
  readonly redeemers: number;
  /** The dearest single redeemer measured, in each dimension. */
  readonly dearest: Cardano.ExUnits;
}

/** What a build learned from redeemers that measured above `seeded`. */
export const custodyReseedOf = (
  evaluated: readonly Cardano.ExUnits[],
  seeded: Cardano.ExUnits,
): CustodyReseed => {
  const sum = evaluated.reduce(
    (total, units) => ({
      memory: total.memory + units.memory,
      steps: total.steps + units.steps,
    }),
    { memory: 0, steps: 0 },
  );
  return {
    measured: {
      memory: Math.max(sum.memory, seeded.memory),
      steps: Math.max(sum.steps, seeded.steps),
    },
    redeemers: evaluated.length,
    dearest: {
      memory: Math.max(0, ...evaluated.map(({ memory }) => memory)),
      steps: Math.max(0, ...evaluated.map(({ steps }) => steps)),
    },
  };
};

/**
 * What a reseed prices a plan of `redeemers` redeemers at: the measurement
 * plus the reseed margin, with each redeemer the plan has beyond the
 * measured transaction, such as a fund input the selection round added,
 * priced as the dearest one measured. It is not capped at the
 * per-transaction limit, so a transaction over the limit still builds and
 * its limit check reports the overrun.
 */
export const reseededExecutionUnits = (
  { measured, redeemers: measuredRedeemers, dearest }: CustodyReseed,
  redeemers: number,
): Cardano.ExUnits => {
  const added = Math.max(0, redeemers - measuredRedeemers);
  return {
    memory: withReseedMargin(measured.memory + added * dearest.memory),
    steps: withReseedMargin(measured.steps + added * dearest.steps),
  };
};
