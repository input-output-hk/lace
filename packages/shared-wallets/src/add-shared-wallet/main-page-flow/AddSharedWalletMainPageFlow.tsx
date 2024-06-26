import { VFC } from 'react';
import { SharedWalletGetStarted, SharedWalletGetStartedSharedProps } from './SharedWalletGetStarted';

type AddSharedWalletMainPageFlowPrps = SharedWalletGetStartedSharedProps & {
  sharedKeys?: string;
};

const makeCopyKeysToClipboard = (sharedKeys: string) => async () => {
  await navigator.clipboard.writeText(sharedKeys);
};

export const AddSharedWalletMainPageFlow: VFC<AddSharedWalletMainPageFlowPrps> = ({ sharedKeys, ...restProps }) => {
  const props = sharedKeys
    ? {
        copyKeysToClipboard: makeCopyKeysToClipboard(sharedKeys),
        createAndImportOptionsDisabled: false as const,
        keysMode: 'copy' as const,
        ...restProps,
      }
    : {
        createAndImportOptionsDisabled: true as const,
        keysMode: 'generate' as const,
        ...restProps,
      };

  return <SharedWalletGetStarted {...props} />;
};
