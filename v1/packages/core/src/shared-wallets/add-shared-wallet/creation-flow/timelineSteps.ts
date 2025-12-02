import { SharedWalletsTranslationKey } from '@lace/translation';
import { SharedWalletCreationStep } from './state-and-types';

export const creationTimelineSteps: { key: SharedWalletCreationStep; name: SharedWalletsTranslationKey }[] = [
  {
    key: SharedWalletCreationStep.Setup,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.walletName',
  },
  {
    key: SharedWalletCreationStep.CoSigners,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.addCosigners',
  },
  {
    key: SharedWalletCreationStep.Quorum,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.defineQuorum',
  },
  {
    key: SharedWalletCreationStep.ShareDetails,
    name: 'sharedWallets.addSharedWallet.layout.timelineStep.walletDetails',
  },
];
