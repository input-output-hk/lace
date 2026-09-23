import { firstValueFrom, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';

import loadSetupAppLock from '../src/setup-app-lock';

import type { AuthSecret } from '@lace-contract/authentication-prompt';

describe('loadSetupAppLock', () => {
  it('reports success without storing anything, for any secret', async () => {
    const setupAppLock = loadSetupAppLock();

    expect(
      await firstValueFrom(
        setupAppLock({
          passphrase: 'irrelevant',
        } as unknown as AuthSecret).pipe(toArray()),
      ),
    ).toEqual([true]);
  });
});
