import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { Sheet } from '../../..';
import { spacing } from '../../../../design-tokens';
import {
  Button,
  Column,
  CustomTag,
  QrCode,
  Row,
  Text,
  Box,
  Divider,
} from '../../../atoms';
import {
  DropdownMenu,
  SheetFooter,
  SheetHeader,
  Tabs,
  useFooterHeight,
} from '../../../molecules';

import type { Theme } from '../../../../design-tokens';
import type { AvatarContent } from '../../../../utils/avatarUtils';
import type { AnyAddress, AddressAliasEntry } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';

type DropdownItem = {
  id: string;
  text: string;
  avatar?: AvatarContent;
};

type TabbedAddressData = Array<{ key: TranslationKey; address: AnyAddress }>;

/** Single address or tabbed list (key = tab label, address = tab content). */
export type ReceiveSheetAddressData = AnyAddress | TabbedAddressData;

export const isTabbedAddressData = (
  data: ReceiveSheetAddressData,
): data is TabbedAddressData =>
  Array.isArray(data) &&
  data.length > 0 &&
  'key' in data[0] &&
  'address' in data[0];

export const getCurrentReceiveAddress = (
  addressData: ReceiveSheetAddressData,
  selectedTabIndex: number,
): AnyAddress => {
  if (isTabbedAddressData(addressData)) {
    const entry = addressData[selectedTabIndex] ?? addressData[0];
    return entry.address;
  }
  return addressData;
};

interface ReceiveSheetTemplateProps {
  addressData: ReceiveSheetAddressData;
  accountName: string;
  index: number;
  items: DropdownItem[];
  onSelectItem: (index: number) => void;
  footerButtonText: string;
  aliasEntries?: AddressAliasEntry[];
  theme: Theme;
  fallback: string;
  actionText: string;
  copyAddressText: string;
  headerTitle: string;
  onCopyAddressPress: (address: string) => void;
  qrCodeBgColor?: string;
  onSharePress: (address: string) => void;
  getAddressInfo?: (address: AnyAddress) => TranslationKey | undefined;
  buyAssetsButtonText?: string;
  onBuyAssetsPress?: () => void;
  selectedAddressTabIndex: number;
  onSelectAddressTab: (index: number) => void;
}

export const ReceiveSheet = ({
  accountName,
  addressData,
  index,
  items,
  onSelectItem,
  footerButtonText,
  aliasEntries,
  theme,
  fallback,
  actionText,
  copyAddressText,
  headerTitle,
  onCopyAddressPress,
  qrCodeBgColor,
  onSharePress,
  getAddressInfo,
  buyAssetsButtonText,
  onBuyAssetsPress,
  selectedAddressTabIndex,
  onSelectAddressTab,
}: ReceiveSheetTemplateProps) => {
  const { t } = useTranslation();
  const selectedItem = items[index];
  const isDarkMode = theme.name === 'dark';
  const tagColor = isDarkMode ? 'black' : 'white';
  const areFooterButtonsVertical = !!(buyAssetsButtonText && onBuyAssetsPress);
  const footerHeight = useFooterHeight({
    vertical: areFooterButtonsVertical,
  });
  const containerStyle = useMemo(
    () => [styles.container, { paddingBottom: footerHeight }],
    [footerHeight, areFooterButtonsVertical],
  );

  const tabbedItems = useMemo(
    () => (isTabbedAddressData(addressData) ? addressData : undefined),
    [addressData],
  );

  const currentAddress = useMemo(
    () => getCurrentReceiveAddress(addressData, selectedAddressTabIndex),
    [addressData, selectedAddressTabIndex],
  );

  const aliases = useMemo(() => {
    if (!currentAddress || !aliasEntries) return [];
    return aliasEntries
      .filter(entry => entry.address === currentAddress.address)
      .map(entry => entry.alias);
  }, [currentAddress, aliasEntries]);

  const addressInfo = getAddressInfo?.(currentAddress);

  return (
    <>
      <SheetHeader title={headerTitle} testID="receive-sheet-header" />

      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={containerStyle}>
        <DropdownMenu
          title={accountName}
          items={items}
          selectedItemId={selectedItem.id}
          onSelectItem={onSelectItem}
          titleAvatar={{
            fallback,
          }}
          actionText={actionText}
          testID="receive-sheet-account-dropdown-menu"
        />

        <Column
          alignItems="center"
          gap={spacing.M}
          style={styles.contentWrapper}>
          <QrCode
            data={currentAddress.address}
            chainType={currentAddress.blockchainName}
            backgroundColor={qrCodeBgColor}
            testID="receive-sheet-qr-code"
          />

          {tabbedItems && tabbedItems.length > 0 && (
            <Box style={styles.tabsContainer}>
              <Tabs
                tabs={tabbedItems.map(item => t(item.key))}
                selectedTab={t(tabbedItems[selectedAddressTabIndex]?.key ?? '')}
                onSelectTab={onSelectAddressTab}
              />
            </Box>
          )}

          <Text.XS
            align="center"
            style={styles.address}
            testID="receive-sheet-address">
            {currentAddress.address}
          </Text.XS>

          {aliases && aliases.length > 0 && (
            <Row gap={spacing.S} style={styles.aliases}>
              {aliases.map(alias => (
                <CustomTag
                  key={alias}
                  size="S"
                  label={alias}
                  color={tagColor}
                  backgroundType="colored"
                  testID="receive-sheet-alias"
                />
              ))}
            </Row>
          )}

          <Button.Secondary
            label={copyAddressText}
            onPress={() => {
              onCopyAddressPress(currentAddress.address);
            }}
            preIconName="Copy"
            iconColor={theme.text.primary}
            testID="receive-sheet-copy-address-button"
          />
        </Column>

        {addressInfo && (
          <>
            <Divider />
            <Column gap={spacing.S}>
              <Text.S variant="secondary" testID="receive-sheet-address-info">
                {t(addressInfo)}
              </Text.S>
            </Column>
          </>
        )}
      </Sheet.Scroll>
      <SheetFooter
        vertical={areFooterButtonsVertical}
        primaryButton={
          areFooterButtonsVertical
            ? {
                label: buyAssetsButtonText,
                onPress: onBuyAssetsPress,
                testID: 'receive-sheet-buy-assets-button',
              }
            : {
                label: footerButtonText,
                onPress: () => {
                  onSharePress(currentAddress.address);
                },
                preIconName: 'Share',
                testID: 'receive-sheet-share-button',
              }
        }
        secondaryButton={
          areFooterButtonsVertical
            ? {
                label: footerButtonText,
                onPress: () => {
                  onSharePress(currentAddress.address);
                },
                preIconName: 'Share',
                testID: 'receive-sheet-share-button',
              }
            : undefined
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.L,
    gap: spacing.M,
  },
  contentWrapper: {
    marginVertical: spacing.M,
  },
  address: {
    width: '100%',
    marginBottom: spacing.S,
  },
  aliases: {
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tabsContainer: {
    paddingBottom: spacing.S,
    paddingTop: spacing.XL,
    width: '100%',
  },
});
