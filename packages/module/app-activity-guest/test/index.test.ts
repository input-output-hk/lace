import { describe, expect, it } from 'vitest';

import moduleMap from '../src';

const guestModule = moduleMap['lace-extension-guest']!;

describe('app-activity-guest module', () => {
  it('registers for the two guest apps only', () => {
    expect(Object.keys(moduleMap)).toEqual([
      'lace-extension-carbon',
      'lace-extension-guest',
    ]);
    expect(guestModule.moduleName).toBe('app-activity-guest');
  });

  it('carries a store, which is what supplies the app-reload seam', () => {
    expect(guestModule.store).toBeDefined();
  });

  it('contributes no addons, unlike the mobile and web activity modules', () => {
    expect(guestModule.addons).toEqual({});
  });
});
