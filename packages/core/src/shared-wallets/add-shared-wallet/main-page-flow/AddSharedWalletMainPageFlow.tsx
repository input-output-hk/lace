import React, { VFC } from 'react';
import { SharedWalletEntry, SharedWalletEntrySharedProps } from './SharedWalletEntry';

type AddSharedWalletMainPageFlowProps = SharedWalletEntrySharedProps & {
  sharedKeys?: string;
};

export const AddSharedWalletMainPageFlow: VFC<AddSharedWalletMainPageFlowProps> = ({ sharedKeys, ...restProps }) =>
  sharedKeys ? (
    <SharedWalletEntry
      keysMode="copy"
      createAndImportOptionsDisabled={false}
      copyKeysToClipboard={async () => {
        await navigator.clipboard.writeText(sharedKeys);
      }}
      {...restProps}
    />
  ) : (
    <SharedWalletEntry keysMode="generate" createAndImportOptionsDisabled {...restProps} />
  );
