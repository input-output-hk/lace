import { describe, expect, it } from 'vitest';

import { MAX_ACTIVITIES_PER_ACCOUNT } from '../../src/const';
import { activitiesTransform } from '../../src/store/init';

describe('activitiesTransform', () => {
  it('should return the same state if the key is not activities', () => {
    const state = {
      account1: [
        {
          id: 'activity1',
          timestamp: 1746526784980,
        },
      ],
    };

    const result = activitiesTransform.in(state, '_persist', {});
    expect(result).toEqual(state);
  });

  it('should return transformed state if the key is activities', () => {
    const activities = Array.from(
      { length: MAX_ACTIVITIES_PER_ACCOUNT + 1 },
      (_, index) => ({
        id: `activity${index + 1}`,
        timestamp: 1746526784980 - index * 5,
      }),
    );

    const state = {
      account1: activities,
    };

    const result = activitiesTransform.in(state, 'activities', {});
    expect(result).toEqual({
      account1: activities.slice(0, MAX_ACTIVITIES_PER_ACCOUNT),
    });
  });
});
