import { hasLaceCapability } from '@lace-lib/extension-shell-client';
import { t } from 'i18next';
import { from } from 'rxjs';

import { setLanguage } from '../lace-client';

import type { LanguagePushDependencies } from '../augmentations';
import type { I18nProvider } from '@lace-contract/i18n';
import type { LaceInitSync } from '@lace-contract/module';

export const initializeDependencies: LaceInitSync<
  I18nProvider & LanguagePushDependencies
> = () => {
  return {
    t,
    // Snapshotted once at store init (ADR 41 handshake): a host without the
    // capability (incl. the mobile / extension wrappers, which have no
    // window.lace) makes the language write-back a silent no-op.
    canSetLanguage: hasLaceCapability('settings.setLanguage'),
    pushLanguageToHost: language => from(setLanguage(language)),
  };
};
