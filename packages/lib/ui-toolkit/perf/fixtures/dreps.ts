/**
 * Deterministic props for the DRepCard benchmark: the browse-DReps row,
 * alternating registered DReps (name + CIP-105 id + voting power, which
 * exercises the BigNumber-based formatAmountToLocale path) and bare ids. No
 * Date.now()/Math.random().
 */
import type React from 'react';

import noop from 'lodash/noop';

import type { DRepCard } from '../../src';

type DRepCardProps = React.ComponentProps<typeof DRepCard>;

const NAMES = ['Cardano Atlantic', 'Wave DRep', 'Hosky Gov', 'Eternl Voice'];

export const makeDRepCardProps = (count: number): DRepCardProps[] =>
  Array.from({ length: count }, (_, index) => {
    const isRegistered = index % 2 === 0;
    const drepId = `drep1${String(index).padStart(10, '0')}qqzr4x`;
    const shared = {
      drepId,
      amount: `${(index + 1) * 500},000.00`,
      isActive: index % 3 !== 0,
      onPress: noop,
      testID: `perf-drep-${index}`,
    };
    return isRegistered
      ? {
          ...shared,
          name: `${NAMES[index % NAMES.length]} ${index}`,
          cip105DrepId: `drep1u${String(index).padStart(10, '0')}m4k2p9`,
          votingPowerLovelace: `${(index + 1) * 445_219}150000`,
          description: 'Independent governance participant',
          avatarUri: `https://drep.example/${index}.png`,
        }
      : shared;
  });
