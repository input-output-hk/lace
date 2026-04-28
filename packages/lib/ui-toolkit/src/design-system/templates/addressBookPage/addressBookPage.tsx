import React, { useMemo, memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Column, Icon, Text } from '../../atoms';
import { Contact, PageHeaderSection, SearchBar } from '../../molecules';
import { GenericFlashList } from '../../organisms';
import {
  isWeb,
  renderLaceFooterLogo,
  usePageHeaderCollapseScroll,
} from '../../util';
import { PageContainerTemplate } from '../pageContainerTemplate/pageContainerTemplate';

import type { ContactItem } from '../../util/types';

interface ActionsProps {
  onClosePress: () => void;
  onAddPress: () => void;
  onContactPress: (contact: ContactItem) => void;
}

interface LabelsProps {
  title: string;
  subtitle: string;
  emptyState: {
    title: string;
    subtitle: string;
  };
  noSearchResults: {
    title: string;
    subtitle: string;
  };
}

interface ValuesProps {
  contacts: ContactItem[];
  debouncedSearchQuery?: string;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
}

interface AddressBookPageTemplateProps {
  actions: ActionsProps;
  labels: LabelsProps;
  values: ValuesProps;
}

const ContactListItem = memo(
  ({
    contact,
    onContactPress,
    style,
  }: {
    contact: ContactItem;
    onContactPress: (contact: ContactItem) => void;
    style?: object;
  }) => {
    const quickActions = useMemo(
      () => ({
        onContactPress: () => {
          onContactPress(contact);
        },
      }),
      [onContactPress, contact],
    );

    // Derive unique chain icons from addresses
    const chainIcons = useMemo(
      () =>
        [
          ...new Set(contact.addresses.map(a => a.blockchainName)),
        ] as Parameters<typeof Contact>[0]['chainIcons'],
      [contact.addresses],
    );

    return (
      <View style={style}>
        <Contact
          name={contact.name}
          addresses={contact.addresses}
          avatarImage={contact.avatar ? { uri: contact.avatar } : undefined}
          chainIcons={chainIcons}
          quickActions={quickActions}
        />
      </View>
    );
  },
);

const renderEmptyState = (
  emptyState: { title: string; subtitle: string },
  searchQuery: string,
) => (
  <Column alignItems="center" gap={spacing.M}>
    <Icon
      name={searchQuery.length > 0 ? 'Search' : 'User'}
      size={100}
      variant="solid"
    />
    <Text.M>{emptyState.title}</Text.M>
    <Text.XS variant="secondary">{emptyState.subtitle}</Text.XS>
  </Column>
);

export const AddressBookPageTemplate = ({
  actions,
  labels,
  values,
}: AddressBookPageTemplateProps) => {
  const {
    contacts,
    debouncedSearchQuery = '',
    searchQuery = '',
    onSearchChange,
  } = values;
  const { onClosePress, onAddPress, onContactPress } = actions;
  const { title, subtitle, emptyState, noSearchResults } = labels;

  const handleSearchChange = useCallback(
    (text: string) => {
      onSearchChange?.(text);
    },
    [onSearchChange],
  );

  const searchBarActions = useMemo(
    () => [
      {
        iconName: 'Plus' as const,
        onPress: onAddPress,
        hasAscendingColor: true,
      },
    ],
    [onAddPress],
  );

  const { collapseScrollY, onScroll } = usePageHeaderCollapseScroll();

  const headerSection = useMemo(
    () => (
      <PageHeaderSection
        title={title}
        subtitle={subtitle}
        onClosePress={isWeb ? onClosePress : undefined}
        collapseScrollY={collapseScrollY}
        testID="address-book-header-section">
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          actions={searchBarActions}
        />
      </PageHeaderSection>
    ),
    [
      title,
      subtitle,
      onClosePress,
      collapseScrollY,
      searchQuery,
      handleSearchChange,
      searchBarActions,
    ],
  );

  // Footer component - not memoized because renderLaceFooterLogo uses hooks
  const ListFooterComponent = (
    <View style={styles.footer}>{renderLaceFooterLogo()}</View>
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyStateContainer}>
        {renderEmptyState(
          debouncedSearchQuery.length > 0 ? noSearchResults : emptyState,
          debouncedSearchQuery,
        )}
      </View>
    ),
    [
      emptyState,
      styles.emptyStateContainer,
      debouncedSearchQuery,
      noSearchResults,
    ],
  );

  return (
    <PageContainerTemplate>
      <View style={styles.fillSpace}>
        {headerSection}
        <GenericFlashList
          style={styles.fillSpace}
          data={contacts}
          renderItem={({ item }) => (
            <ContactListItem contact={item} onContactPress={onContactPress} />
          )}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          contentContainerStyle={styles.contactList}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      </View>
    </PageContainerTemplate>
  );
};

const styles = StyleSheet.create({
  fillSpace: {
    flex: 1,
  },
  contactList: {
    paddingBottom: spacing.XXXXL,
  },
  emptyStateContainer: {
    paddingVertical: spacing.XXXL,
  },
  footer: {
    paddingTop: spacing.XL,
  },
});
