import { t } from 'i18next';
import { TimelineStep } from '../SharedWalletLayout';

export const keyGenerationTimelineSteps: TimelineStep<string>[] = [
  {
    key: 'enter-password',
    name: t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.timeline.enterPassword'),
  },
  {
    key: 'copy-key',
    name: t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.timeline.copyKey'),
  },
];
export const keyGenerationHWTimelineSteps: TimelineStep<string>[] = [
  {
    key: 'enter-password',
    name: t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.timeline.confirmAccess'),
  },
  {
    key: 'copy-key',
    name: t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.timeline.copyKey'),
  },
];
