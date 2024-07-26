import React, { useEffect } from 'react';
import { useSections } from '../store';
import { Sections } from '../types';
import { SendTransactionSummary } from './SendTransactionSummary';

import { ConfirmPassword } from './ConfirmPassword';
import { TransactionSuccess } from './TransactionSuccess';
import { TransactionFail } from './TransactionFail';
import { UnauthorizedTransaction } from './UnauthorizedTransaction';
import { AddressList } from './AddressList';
import { AddressForm } from './AddressForm';
import { SendTransactionLayout } from './SendTransactionLayout';

import { TransactionForm } from './Form';
import { AssetPicker } from './AssetPicker';
import { useKeyboardShortcut } from '@lace/common';
import { useDrawer } from '@views/browser/stores';
import { sectionsWithArrowIcon } from './SendTransactionDrawer';
import { AddressChangeDetail } from '@src/features/address-book/components/AddressChangeDetail';
import { useAddressBookStore } from '@src/features/address-book/store';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useCustomSubmitApi, useHandleResolver, useUpdateAddressStatus } from '@hooks';
import { AddressBookSchema } from '@lib/storage';
import { useWalletStore } from '@stores';
import { DrawerContent } from '@views/browser/components/Drawer';
import { ImportSharedWalletTransaction } from './ImportSharedWalletTransaction';

interface SendTransactionProps {
  isPopupView?: boolean;
  scrollableTargetId?: string;
  scrollableContainerRef?: React.RefObject<HTMLElement>;
}

export const Transaction = withAddressBookContext(
  ({ isPopupView, scrollableTargetId, scrollableContainerRef }: SendTransactionProps): React.ReactElement => {
    const { currentSection: section, setPrevSection } = useSections();
    const [config, clearContent] = useDrawer();
    const { list: addressList } = useAddressBookContext();
    const {
      addressToEdit: { name, address }
    } = useAddressBookStore();
    const handleResolver = useHandleResolver();
    const { environmentName } = useWalletStore();
    const { getCustomSubmitApiForNetwork } = useCustomSubmitApi();

    const validatedAddressStatus = useUpdateAddressStatus(addressList as AddressBookSchema[], handleResolver);

    useKeyboardShortcut(['Escape'], () => {
      if (sectionsWithArrowIcon.includes(section.currentSection)) {
        setPrevSection();
      } else {
        config?.onClose ? config?.onClose() : clearContent();
      }
    });

    useEffect(() => {
      if (scrollableContainerRef && scrollableContainerRef.current) {
        scrollableContainerRef.current.scrollTop = 0;
      }
    }, [section.currentSection, scrollableContainerRef]);

    const sectionMap: Record<Sections, React.ReactElement> = {
      ...(config.content === DrawerContent.SEND_TRANSACTION && {
        [Sections.FORM]: <TransactionForm isPopupView={isPopupView} />
      }),
      ...(config.content === DrawerContent.CO_SIGN_TRANSACTION && {
        [Sections.IMPORT_SHARED_WALLET_TRANSACTION_JSON]: <ImportSharedWalletTransaction />
      }),
      [Sections.SUMMARY]: <SendTransactionSummary isPopupView={isPopupView} />,
      [Sections.CONFIRMATION]: <ConfirmPassword />,
      [Sections.SUCCESS_TX]: <TransactionSuccess />,
      [Sections.FAIL_TX]: (
        <TransactionFail showCustomApiBanner={getCustomSubmitApiForNetwork(environmentName).status} />
      ),
      [Sections.UNAUTHORIZED_TX]: <UnauthorizedTransaction />,
      [Sections.ADDRESS_LIST]: <AddressList isPopupView={isPopupView} scrollableTargetId={scrollableTargetId} />,
      [Sections.ADDRESS_FORM]: <AddressForm isPopupView={isPopupView} />,
      [Sections.ASSET_PICKER]: <AssetPicker isPopupView={isPopupView} />,
      [Sections.ADDRESS_CHANGE]: (
        <AddressChangeDetail
          name={name}
          isPopupView={isPopupView}
          expectedAddress={validatedAddressStatus[address]?.error?.expectedAddress ?? ''}
          actualAddress={validatedAddressStatus[address]?.error?.actualAddress ?? ''}
        />
      )
    };

    return (
      <SendTransactionLayout isPopupView={isPopupView}>{sectionMap[section.currentSection]}</SendTransactionLayout>
    );
  }
);
