import { SharedWalletsTranslationKey } from '@src/../../translation/dist';
import { SharedWalletRestorationStep } from './types';

export const restorationTimelineSteps: { key: SharedWalletRestorationStep; name: SharedWalletsTranslationKey }[] = [
  {
    key: SharedWalletRestorationStep.Import,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.importWallet',
  },
  {
    key: SharedWalletRestorationStep.Done,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.allDone',
  },
];
