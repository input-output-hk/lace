/**
 * Deterministic props for the ui-toolkit GovernanceCard benchmark: one card
 * per account as the governance center renders them, alternating the two
 * steady states (delegated with a resolved DRep / not yet delegated). No
 * Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { GovernanceCard } from '../../src';

type GovernanceCardProps = React.ComponentProps<typeof GovernanceCard>;

export const makeGovernanceCardProps = (count: number): GovernanceCardProps[] =>
  Array.from({ length: count }, (_, index) => {
    const isDelegated = index % 2 === 0;
    const shared = {
      avatarImage: { uri: `https://avatar.example/${index}.png` },
      accountName: `Account ${index}`,
      accountType: 'Cardano',
      isShielded: false,
      blockchain: 'Cardano' as const,
      votingPower: `${(index + 1) * 1000},234.56`,
      coin: 'ADA',
      testID: `perf-governance-${index}`,
    };
    return isDelegated
      ? {
          ...shared,
          state: 'delegated' as const,
          drepLabel: `DRep ${index}`,
          drepDisplayId: `drep1q${String(index).padStart(6, '0')}...x${index}`,
          drepAvatarUri: `https://drep.example/${index}.png`,
          drepVotingPower: `₳ ${(index + 1) * 100},219.15`,
          onUpdateDelegation: noop,
        }
      : {
          ...shared,
          state: 'not-delegated' as const,
          onDelegate: noop,
        };
  });
