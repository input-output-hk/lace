import { ContactId } from '@lace-contract/address-book';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { ContactSheet, Modal, Sheet, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';
import { useContactForm } from '../../hooks/useContactForm';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const CONTACT_SHEET_TEST_ID = 'contact-sheet';

export const AddContactSheet = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.AddContact>) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const contactId = route.params?.contactId;
  const source = route.params?.source;
  const contacts = useLaceSelector('addressBook.selectAllContacts');
  const deleteContact = useDispatchLaceAction('addressBook.deleteContact');
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const showToast = useDispatchLaceAction('ui.showToast');
  const { theme } = useTheme();

  const contact = useMemo(() => {
    if (!contactId) return undefined;
    return contacts.find(c => c.id === ContactId(contactId));
  }, [contactId, contacts]);

  const onSendFlowClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const form = useContactForm(
    contact,
    source === 'send-flow' ? { onClose: onSendFlowClose } : undefined,
  );
  const mode = contact ? 'edit' : 'add';

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t(
            mode === 'add'
              ? 'v2.contact-sheet.title.add'
              : 'v2.contact-sheet.title.edit',
          )}
        />
      ),
      footer: (
        <Sheet.Footer
          showDivider={false}
          secondaryButton={{
            label: t('v2.contact-sheet.button.cancel'),
            onPress: form.onCancel,
            testID: `${CONTACT_SHEET_TEST_ID}-cancel-button`,
          }}
          primaryButton={{
            label: t('v2.contact-sheet.button.save'),
            onPress: form.onSave,
            disabled: form.saveDisabled,
            testID: `${CONTACT_SHEET_TEST_ID}-save-button`,
          }}
        />
      ),
    });
  }, [navigation, t, mode, form.onCancel, form.onSave, form.saveDisabled]);

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
    NavigationControls.closeSheet();
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
