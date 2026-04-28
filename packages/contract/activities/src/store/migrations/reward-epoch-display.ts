import { ActivityType } from '../../const';

import type { ActivitiesSliceState } from '../slice';
import type { PersistedState } from '@lace-contract/module';
import type { PersistedState as ReduxPersistedState } from 'redux-persist';

const REWARD_EPOCH_DISPLAY_OFFSET = 2;

/**
 * Migration from v1 to v2: Reward activities stored epoch as API value (earned epoch).
 * We now display epoch as earned + 2 (spendable/distribution epoch). Add 2 to
 * persisted reward activities so the UI shows the correct epoch without waiting for sync.
 */
export const rewardEpochDisplay = (state: ReduxPersistedState) => {
  const typedState = state as PersistedState<ActivitiesSliceState>;
  const activitiesMap = typedState.activities ?? {};

  for (const list of Object.values(activitiesMap)) {
    if (!Array.isArray(list)) continue;
    for (const activity of list) {
      if (
        activity.type === ActivityType.Rewards &&
        activity.blockchainSpecific &&
        typeof (activity.blockchainSpecific as { epoch?: number }).epoch ===
          'number'
      ) {
        const meta = activity.blockchainSpecific as { epoch: number };
        meta.epoch = meta.epoch + REWARD_EPOCH_DISPLAY_OFFSET;
      }
    }
  }

  return typedState;
};
