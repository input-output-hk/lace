import React, { VFC } from 'react';
import { SharedWalletEntry, SharedWalletEntrySharedProps } from './SharedWalletEntry';

type AddSharedWalletMainPageFlowProps = SharedWalletEntrySharedProps & {
  sharedWalletKey?: string;
};

export const AddSharedWalletMainPageFlow: VFC<AddSharedWalletMainPageFlowProps> = ({ sharedWalletKey, ...restProps }) =>
  sharedWalletKey ? (
    <SharedWalletEntry
      sharedWalletKeyMode="copy"
      createAndImportOptionsDisabled={false}
      onKeysCopyClick={async () => {
        await navigator.clipboard.writeText(sharedWalletKey);
      }}
      {...restProps}
    />
  ) : (
    <SharedWalletEntry sharedWalletKeyMode="generate" createAndImportOptionsDisabled {...restProps} />
  );
