import React, { VFC } from 'react';
import { SharedWalletGetStarted, SharedWalletGetStartedSharedProps } from './SharedWalletGetStarted';

type AddSharedWalletMainPageFlowProps = SharedWalletGetStartedSharedProps & {
  sharedKeys?: string;
};

export const AddSharedWalletMainPageFlow: VFC<AddSharedWalletMainPageFlowProps> = ({ sharedKeys, ...restProps }) =>
  sharedKeys ? (
    <SharedWalletGetStarted
      keysMode="copy"
      createAndImportOptionsDisabled={false}
      copyKeysToClipboard={async () => {
        await navigator.clipboard.writeText(sharedKeys);
      }}
      {...restProps}
    />
  ) : (
    <SharedWalletGetStarted keysMode="generate" createAndImportOptionsDisabled {...restProps} />
  );
