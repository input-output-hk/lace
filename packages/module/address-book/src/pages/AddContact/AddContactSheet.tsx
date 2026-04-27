import { ContactId } from '@lace-contract/address-book';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { ContactSheet, Modal, useTheme } from '@lace-lib/ui-toolkit';
import React, { useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';
import { useContactForm } from '../../hooks/useContactForm';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const CONTACT_SHEET_TEST_ID = 'contact-sheet';

export const AddContactSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.AddContact>) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const contactId = route.params?.contactId;
  const contacts = useLaceSelector('addressBook.selectAllContacts');
  const deleteContact = useDispatchLaceAction('addressBook.deleteContact');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const showToast = useDispatchLaceAction('ui.showToast');
  const { theme } = useTheme();

  const contact = useMemo(() => {
    if (!contactId) return undefined;
    return contacts.find(c => c.id === ContactId(contactId));
  }, [contactId, contacts]);

  const form = useContactForm(contact);
  const mode = contact ? 'edit' : 'add';

  const onDeletePress = () => {
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
  };

  const handleConfirmDelete = () => {
    if (contact?.id) {
      deleteContact(contact.id);
      trackEvent('address book | contact | deleted');
    }
    closeDeleteModal();
    NavigationControls.sheets.close();
    showToast({
      text: t('v2.pages.address-book.contact-details.delete-success'),
      color: 'positive',
      duration: 3,
      leftIcon: {
        name: 'UserMinus',
        size: 20,
        color: theme.background.primary,
      },
    });
  };

  return (
    <>
      <ContactSheet
        mode={mode}
        testID={CONTACT_SHEET_TEST_ID}
        {...form}
        onRemoveContact={onDeletePress}
      />
      <Modal
        visible={isDeleteModalVisible}
        onClose={closeDeleteModal}
        onCancel={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        iconSize={64}
        icon="AlertSquare"
        titleIcon="UserMinus"
        title={t('v2.pages.address-book.contact-details.delete-modal.title')}
        description={t(
          'v2.pages.address-book.contact-details.delete-modal.description',
        )}
        cancelText={t(
          'v2.pages.address-book.contact-details.delete-modal.cancel',
        )}
        confirmText={t(
          'v2.pages.address-book.contact-details.delete-modal.confirm',
        )}
      />
    </>
  );
};
