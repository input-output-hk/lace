import type { WizardOpenOrigin } from './store/slice';
import type { WalletId } from '@lace-contract/wallet-repo';

export const openWizardRef: {
  current?: (
    origin: WizardOpenOrigin,
    options?: {
      /** Pre-selects a loaded wallet as the source, skipping the source
       * chooser — the per-wallet "migrate this wallet" entry. */
      sourceWalletId?: WalletId;
    },
  ) => void;
} = { current: undefined };
