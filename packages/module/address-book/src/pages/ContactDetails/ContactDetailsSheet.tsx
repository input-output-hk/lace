import { ContactId } from '@lace-contract/address-book';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  ContactDetailsSheetTemplate,
  Modal,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { useCopyToClipboard } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { SheetScreenProps } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';

export const ContactDetailsSheet = ({
  route,
}: SheetScreenProps<SheetRoutes.ContactDetails>) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { contactId } = route.params;
  const contacts = useLaceSelector('addressBook.selectAllContacts');
  const showToast = useDispatchLaceAction('ui.showToast');
  const deleteContact = useDispatchLaceAction('addressBook.deleteContact');
  const { theme } = useTheme();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      showToast({
        text: t('v2.generic.btn.copy-success'),
        color: 'positive',
        duration: 3,
        leftIcon: {
          name: 'Checkmark',
          size: 20,
          color: theme.background.primary,
        },
      });
    },
    onError: () => {
      showToast({
        text: t('v2.generic.btn.copy-error'),
        color: 'negative',
        duration: 3,
        leftIcon: {
          name: 'AlertTriangle',
          size: 20,
          color: theme.background.primary,
        },
      });
    },
  });

  const contact = useMemo(() => {
    if (!contactId) return undefined;
    return contacts.find(c => c.id === ContactId(contactId));
  }, [contacts, contactId]);

  const avatar = useMemo(
    () => ({
      img: contact?.avatar ? { uri: contact.avatar } : undefined,
      fallback:
        contact?.name
          .split(' ')
          .map(name => name[0])
          .join('') ?? '?',
    }),
    [contact?.avatar, contact?.name],
  );

  const onCopyPress = (address: string) => {
    copyToClipboard(address);
  };

  const onEditPress = () => {
    if (contact?.id) {
      NavigationControls.sheets.navigate(SheetRoutes.AddContact, {
        contactId: contact.id,
      });
    }
  };

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

  useEffect(() => {
    if (!contact) {
      NavigationControls.sheets.close();
    }
  }, [contact]);

  return (
    <>
      <ContactDetailsSheetTemplate
        actions={{
          onCopyPress,
          onEditPress,
          onDeletePress,
        }}
        labels={{
          headerTitle: t('v2.pages.address-book.contact-details.title'),
          name: contact?.name ?? '',
          deleteButtonLabel: t('v2.pages.address-book.contact-details.delete'),
          editButtonLabel: t('v2.pages.address-book.contact-details.edit'),
        }}
        avatar={avatar}
        contact={{
          addresses:
            contact?.addresses?.map(address => ({
              blockchainName: address.blockchainName as IconName,
              address: address.address,
            })) ?? [],
        }}
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
