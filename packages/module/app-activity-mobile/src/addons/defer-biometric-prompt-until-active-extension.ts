import { filter, map, take } from 'rxjs';

import { appState$ } from '../store/app-state-listener';

import type { AvailableAddons } from '..';
import type { DeferBiometricPromptUntilActiveExtension } from '@lace-contract/authentication-prompt';
import type { ContextualLaceInit } from '@lace-contract/module';

const extension: ContextualLaceInit<
  DeferBiometricPromptUntilActiveExtension,
  AvailableAddons
> = () => ({
  createWaitUntilBiometricPromptAllowed: () =>
    appState$.pipe(
      filter(state => state === 'active'),
      take(1),
      map(() => undefined),
    ),
});

export default extension;
