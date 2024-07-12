import { t } from 'i18next';
import { SharedWalletCreationStep } from './state-and-types';

export const creationTimelineSteps = [
  {
    key: SharedWalletCreationStep.Setup,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.walletName'),
  },
  {
    key: SharedWalletCreationStep.CoSigners,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.addCosigners'),
  },
  {
    key: SharedWalletCreationStep.Quorum,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.defineQuorum'),
  },
  {
    key: SharedWalletCreationStep.ShareDetails,
    name: t('sharedWallets.addSharedWallet.layout.timelineStep.walletDetails'),
  },
];
