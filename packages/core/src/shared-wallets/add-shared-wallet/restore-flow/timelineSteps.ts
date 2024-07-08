import { t } from 'i18next';
import { SharedWalletRestorationStep } from './types';

export const restorationTimelineSteps = [
  {
    key: SharedWalletRestorationStep.Import,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.importWallet'),
  },
  {
    key: SharedWalletRestorationStep.Done,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.allDone'),
  },
];
