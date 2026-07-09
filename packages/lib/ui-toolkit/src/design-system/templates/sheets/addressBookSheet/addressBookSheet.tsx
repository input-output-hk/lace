import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Button, Column, Icon, Text } from '../../../atoms';
import { Contact } from '../../../molecules';
import { footerHeight, GenericFlashList, Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms';
import type { ContactItem } from '../../../util/types';

interface AddressBookSheetProps {
  emptyLabel: string;
  addContactLabel?: string;
  contacts: ContactItem[];
  onSelectAddress?: (address: string) => void;
  ownAccounts?: ContactItem[];
  ownAccountsSectionLabel?: string;
  contactsSectionLabel?: string;
  onAddPress?: () => void;
}

const AddContactButton = ({
  label,
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) => {
  if (!label || !onPress) return null;
  return (
    <Button.Primary
      label={label}
      onPress={onPress}
      preIconName="Plus"
      testID="address-book-add-contact-button"
    />
  );
};

const AddressBookContact = ({
  item,
  onSelectAddress,
  testID,
}: {
  item: ContactItem;
  onSelectAddress?: (address: string) => void;
  testID: string;
}) => (
  <Contact
    name={item.name}
    addresses={item.addresses}
    avatarImage={item.avatar ? { uri: item.avatar } : undefined}
    quickActions={{ onSelectAddress }}
    chainIcons={
      [...new Set(item.addresses.map(a => a.blockchainName))] as IconName[]
    }
    testID={testID}
  />
);

const SectionLabel = ({
  isVisible,
  label,
}: {
  isVisible: boolean;
  label?: string;
}) =>
  isVisible && label !== undefined ? (
    <Text.S style={styles.sectionLabel}>{label}</Text.S>
  ) : null;

const OwnAccountsSection = ({
  ownAccounts,
  hasBothSections,
  label,
  onSelectAddress,
}: {
  ownAccounts: ContactItem[];
  hasBothSections: boolean;
  label?: string;
  onSelectAddress?: (address: string) => void;
}) => {
  if (ownAccounts.length === 0) return null;

  return (
    <>
      <SectionLabel isVisible={hasBothSections} label={label} />
      <Column>
        {ownAccounts.map(item => (
          <AddressBookContact
            key={item.id}
            item={item}
            onSelectAddress={onSelectAddress}
            testID={`own-account-item-${item.name.toLowerCase()}`}
          />
        ))}
      </Column>
    </>
  );
};

const ContactsSection = ({
  contacts,
  hasBothSections,
  label,
  onSelectAddress,
}: {
  contacts: ContactItem[];
  hasBothSections: boolean;
  label?: string;
  onSelectAddress?: (address: string) => void;
}) => {
  if (contacts.length === 0) return null;

  return (
    <>
      <SectionLabel isVisible={hasBothSections} label={label} />
      <Column>
        <GenericFlashList<ContactItem>
          scrollEnabled={false}
          renderItem={({ item }) => (
            <AddressBookContact
              item={item}
              onSelectAddress={onSelectAddress}
              testID={`contact-item-${item.name.toLowerCase()}`}
            />
          )}
          data={contacts}
          keyExtractor={item => item.name}
          showsVerticalScrollIndicator={false}
        />
      </Column>
    </>
  );
};

const EmptyState = ({
  emptyLabel,
  addContactLabel,
  onAddPress,
}: Pick<
  AddressBookSheetProps,
  'addContactLabel' | 'emptyLabel' | 'onAddPress'
>) => (
  <Column style={styles.emptyContainer}>
    <Icon name={'Sad'} size={48} variant="solid" />
    <Text.M>{emptyLabel}</Text.M>
    <AddContactButton label={addContactLabel} onPress={onAddPress} />
  </Column>
);

export const AddressBookTemplate = ({
  emptyLabel,
  addContactLabel,
  contacts,
  onSelectAddress,
  ownAccounts = [],
  ownAccountsSectionLabel,
  contactsSectionLabel,
  onAddPress,
}: AddressBookSheetProps) => {
  const hasAnyItems = ownAccounts.length > 0 || contacts.length > 0;
  const hasBothSections = ownAccounts.length > 0 && contacts.length > 0;

  return (
    <Sheet.Scroll>
      {!hasAnyItems ? (
        <EmptyState
          emptyLabel={emptyLabel}
          addContactLabel={addContactLabel}
          onAddPress={onAddPress}
        />
      ) : (
        <Column gap={spacing.M} style={styles.contactsListContainer}>
          <OwnAccountsSection
            ownAccounts={ownAccounts}
            hasBothSections={hasBothSections}
            label={ownAccountsSectionLabel}
            onSelectAddress={onSelectAddress}
          />
          <ContactsSection
            contacts={contacts}
            hasBothSections={hasBothSections}
            label={contactsSectionLabel}
            onSelectAddress={onSelectAddress}
          />
          <AddContactButton label={addContactLabel} onPress={onAddPress} />
        </Column>
      )}
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.XXXL,
    paddingVertical: spacing.XXXL,
  },
  sectionLabel: {
    paddingHorizontal: spacing.M,
    paddingTop: spacing.M,
    paddingBottom: spacing.S,
  },
  contactsListContainer: {
    paddingBottom: footerHeight.horizontal,
  },
});
