import { type SheetRoutes, type SheetScreenProps } from '@lace-lib/navigation';
import { AccountKeySheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAccountKey } from './useAccountKey';

export const AccountKey = (props: SheetScreenProps<SheetRoutes.AccountKey>) => {
  const {
    title,
    PublicKeysSupplier,
    currentAccount,
    chainType,
    copyButtonLabel,
    shareButtonLabel,
    doneButtonLabel,
    onDone,
    doneButtonTestID,
    onCopy,
    onShare,
    shouldShowShareButton,
    qrCodeBgColor,
  } = useAccountKey(props);

  if (!currentAccount || !PublicKeysSupplier) return null;

  return (
    <PublicKeysSupplier account={currentAccount}>
      {publicKeys => (
        <AccountKeySheetTemplate
          qrCodeBgColor={qrCodeBgColor}
          shouldShowShareButton={shouldShowShareButton}
          doneButtonLabel={doneButtonLabel}
          onDone={onDone}
          doneButtonTestID={doneButtonTestID}
          title={title}
          publicKeys={publicKeys}
          chainType={chainType}
          copyButtonLabel={copyButtonLabel}
          shareButtonLabel={shareButtonLabel}
          onCopy={onCopy}
          onShare={onShare}
        />
      )}
    </PublicKeysSupplier>
  );
};
