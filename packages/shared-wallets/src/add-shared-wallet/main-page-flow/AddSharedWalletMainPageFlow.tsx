import { VFC } from 'react';
import { SharedWalletGetStarted, SharedWalletGetStartedSharedProps } from './SharedWalletGetStarted';

type AddSharedWalletMainPageFlowPrps = SharedWalletGetStartedSharedProps & {
  sharedKeys?: string;
};

const makeCopyKeysToClipboard = (sharedKeys: string) => async () => {
  await navigator.clipboard.writeText(sharedKeys);
};

export const AddSharedWalletMainPageFlow: VFC<AddSharedWalletMainPageFlowPrps> = ({ sharedKeys, ...restProps }) => (
  <SharedWalletGetStarted
    keysMode={!sharedKeys ? 'generate' : 'copy'}
    createAndImportOptionsDisabled={!sharedKeys}
    copyKeysToClipboard={sharedKeys ? makeCopyKeysToClipboard(sharedKeys) : undefined}
    {...restProps}
  />
);
