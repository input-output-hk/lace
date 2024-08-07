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
import { sectionsWithArrowIcon, useHandleClose } from './SendTransactionDrawer';
import { AddressChangeDetail } from '@src/features/address-book/components/AddressChangeDetail';
import { useAddressBookStore } from '@src/features/address-book/store';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useCustomSubmitApi, useHandleResolver, useUpdateAddressStatus } from '@hooks';
import { AddressBookSchema } from '@lib/storage';
import { useWalletStore } from '@stores';
import { ImportSharedWalletTransaction } from './ImportSharedWalletTransaction';

interface SendTransactionProps {
  flow: 'send' | 'co-sign';
  isPopupView?: boolean;
  scrollableTargetId?: string;
  scrollableContainerRef?: React.RefObject<HTMLElement>;
}

export const Transaction = withAddressBookContext(
  ({ flow, isPopupView, scrollableTargetId, scrollableContainerRef }: SendTransactionProps): React.ReactElement => {
    const { currentSection: section, setPrevSection } = useSections();
    const { onClose } = useHandleClose();
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
        onClose();
      }
    });

    useEffect(() => {
      if (scrollableContainerRef && scrollableContainerRef.current) {
        scrollableContainerRef.current.scrollTop = 0;
      }
    }, [section.currentSection, scrollableContainerRef]);

    const sectionMap: Record<Sections, React.ReactElement> = {
      ...(flow === 'send' && {
        [Sections.FORM]: <TransactionForm isPopupView={isPopupView} />
      }),
      ...(flow === 'co-sign' && {
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
