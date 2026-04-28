import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Column, Icon, Text } from '../../../atoms';
import {
  Contact,
  SheetFooter,
  SheetHeader,
  useFooterHeight,
} from '../../../molecules';
import { GenericFlashList, Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms';
import type { ContactItem } from '../../../util/types';

interface AddressBookSheetProps {
  title: string;
  emptyLabel: string;
  contacts: ContactItem[];
  cancelButtonLabel: string;
  onCancelPress: () => void;
  onSelectAddress?: (address: string) => void;
}

export const AddressBookTemplate = ({
  title,
  emptyLabel,
  contacts,
  cancelButtonLabel,
  onCancelPress,
  onSelectAddress,
}: AddressBookSheetProps) => {
  const hasContacts = contacts.length > 0;
  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: hasContacts ? footerHeight : 0 }),
    [hasContacts, footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll contentContainerStyle={scrollContainerStyle}>
        {!hasContacts ? (
          <Column style={styles.emptyContainer}>
            <Icon name={'Sad'} size={48} variant="solid" />
            <Text.M>{emptyLabel}</Text.M>
          </Column>
        ) : (
          <Column style={styles.listContainer}>
            <GenericFlashList<ContactItem>
              renderItem={({ item }) => (
                <Contact
                  name={item.name}
                  addresses={item.addresses}
                  avatarImage={item.avatar ? { uri: item.avatar } : undefined}
                  quickActions={{
                    onSelectAddress: onSelectAddress,
                  }}
                  chainIcons={
                    [
                      ...new Set(item.addresses.map(a => a.blockchainName)),
                    ] as IconName[]
                  }
                  testID={`contact-item-${item.name.toLowerCase()}`}
                />
              )}
              data={contacts}
              keyExtractor={item => item.name}
              showsVerticalScrollIndicator={false}
            />
          </Column>
        )}
      </Sheet.Scroll>
      {hasContacts && (
        <SheetFooter
          secondaryButton={{
            label: cancelButtonLabel,
            onPress: onCancelPress,
            testID: 'address-book-cancel-button',
          }}
        />
      )}
    </>
  );
};

const LIST_HEIGHT = 400;

const styles = StyleSheet.create({
  emptyContainer: {
    height: LIST_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.L,
  },
  listContainer: {
    height: LIST_HEIGHT,
  },
});
