import React, { useEffect } from 'react';
import { useSections } from '../store';
import { Sections } from '../types';
import { SendTransactionSummary } from './SendTransactionSummary';

import { ConfirmPassword } from './ConfirmPassword';
import { TransactionSuccess } from './TransactionSuccess';
import { TransactionFail } from './TransactionFail';
import { AddressList } from './AddressList';
import { AddressForm } from './AddressForm';
import { SendTransactionLayout } from './SendTransactionLayout';

import { TransactionForm } from './Form';
import { AssetPicker } from './AssetPicker';
import { useKeyboardShortcut } from '@lace/common';
import { useDrawer } from '@views/browser/stores';
import { sectionsWithArrowIcon } from './SendTransactionDrawer';

interface SendTransactionProps {
  isPopupView?: boolean;
  scrollableTargetId?: string;
  scrollableContainerRef?: React.RefObject<HTMLElement>;
}

export const SendTransaction = ({
  isPopupView,
  scrollableTargetId,
  scrollableContainerRef
}: SendTransactionProps): React.ReactElement => {
  const { currentSection: section, setPrevSection } = useSections();
  const [config, clearContent] = useDrawer();

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

  // TODO: move isPopupView to store, jira ticket need to be added https://input-output.atlassian.net/browse/LW-5296
  const sectionMap: Record<Sections, React.ReactElement> = {
    [Sections.FORM]: <TransactionForm isPopupView={isPopupView} />,
    [Sections.SUMMARY]: <SendTransactionSummary isPopupView={isPopupView} />,
    [Sections.CONFIRMATION]: <ConfirmPassword />,
    [Sections.SUCCESS_TX]: <TransactionSuccess />,
    [Sections.FAIL_TX]: <TransactionFail />,
    [Sections.ADDRESS_LIST]: <AddressList isPopupView={isPopupView} scrollableTargetId={scrollableTargetId} />,
    [Sections.ADDRESS_FORM]: <AddressForm isPopupView={isPopupView} />,
    [Sections.ASSET_PICKER]: <AssetPicker isPopupView={isPopupView} />
  };

  return <SendTransactionLayout isPopupView={isPopupView}>{sectionMap[section.currentSection]}</SendTransactionLayout>;
};
