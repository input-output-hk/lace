import { describe, expect, it } from 'vitest';

import { ActivityType } from '../src/activity-type';
import { ActivityType as StableActivityType } from '../src/activity-type.stable';

describe('ActivityType of the stable SDK build', () => {
  it('is every activity type but the designation one, with the same values', () => {
    const { NightDesignation, ...others } = ActivityType;
    expect(NightDesignation).toBe('NightDesignation');
    expect({ ...StableActivityType }).toEqual(others);
  });
});
