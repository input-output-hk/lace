import { describe, expect, it } from 'vitest';

import { delegationReserve } from '../../../src/store/helpers/delegation-reserve';

const protocolParameters = { stakeKeyDeposit: 2_000_000 };

describe('delegationReserve', () => {
  // The deposit plus fee head-room, stated as the figure rather than the
  // formula: restating the sum would pass whatever the constant became.
  it('reserves the stake-key deposit plus fee head-room when a target exists', () => {
    expect(
      delegationReserve({ hasDelegationTarget: true, protocolParameters }),
    ).toBe(2_500_000n);
  });

  // Zero rather than a small number: the gate has to be inert, not lenient,
  // where no delegation will run at all.
  it('reserves nothing when no delegation will run', () => {
    expect(
      delegationReserve({ hasDelegationTarget: false, protocolParameters }),
    ).toBe(0n);
  });

  it('follows the protocol parameter rather than assuming a 2 ADA deposit', () => {
    expect(
      delegationReserve({
        hasDelegationTarget: true,
        protocolParameters: { stakeKeyDeposit: 500_000 },
      }),
    ).toBe(1_000_000n);
  });
});
