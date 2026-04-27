import { useTranslation } from '@lace-contract/i18n';
import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Button, Column, QrCode, Text } from '../../../atoms';
import {
  SheetFooter,
  SheetHeader,
  Tabs,
  useFooterHeight,
} from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { TabItem } from '../../../molecules';
import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainName } from '@lace-lib/util-store';

export type PublicKeys<Key extends string> =
  | {
      type: 'multi';
      value: Array<{ nameTranslationKey: TranslationKey; value: Key }>;
    }
  | {
      type: 'single';
      value: Key;
    };

interface AccountKeySheetTemplateProps<Key extends string> {
  title: string;
  publicKeys: PublicKeys<Key>;
  chainType?: BlockchainName;
  copyButtonLabel: string;
  shareButtonLabel: string;
  onCopy: (key: Key) => void;
  onShare: (key: Key) => void;
  testID?: string;
  copyButtonTestID?: string;
  shareButtonTestID?: string;
  shouldShowShareButton?: boolean;
  doneButtonLabel: string;
  onDone: () => void;
  doneButtonTestID: string;
  qrCodeBgColor?: string;
}

export const AccountKeySheetTemplate = <Key extends string>({
  title,
  publicKeys,
  chainType,
  copyButtonLabel,
  shareButtonLabel,
  onCopy,
  onShare,
  testID = 'account-key-sheet',
  copyButtonTestID = 'account-key-copy-button',
  shareButtonTestID = 'account-key-share-button',
  shouldShowShareButton,
  doneButtonLabel,
  onDone,
  doneButtonTestID,
  qrCodeBgColor,
}: AccountKeySheetTemplateProps<Key>) => {
  const footerHeight = useFooterHeight();
  const styles = getStyles({ footerHeight });
  const { t } = useTranslation();
  const { theme } = useTheme();

  const tabItems = useMemo<TabItem<number>[]>(
    () =>
      publicKeys.type === 'multi'
        ? publicKeys.value.map(({ nameTranslationKey }, index) => {
            return {
              label: t(nameTranslationKey),
              value: index,
            };
          })
        : [],
    [publicKeys, t],
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  let selectedKey: Key = '' as Key;
  if (publicKeys.type === 'multi') {
    selectedKey = publicKeys.value[selectedIndex]?.value ?? '';
  }
  if (publicKeys.type === 'single') {
    selectedKey = publicKeys.value;
  }

  return (
    <>
      <SheetHeader title={title} testID="account-key-sheet-header" />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <Column style={styles.content} alignItems="center" gap={spacing.L}>
          <QrCode
            data={selectedKey}
            chainType={chainType}
            logoSize={60}
            backgroundColor={qrCodeBgColor}
          />
          {publicKeys.type === 'multi' && (
            <Tabs
              tabs={tabItems}
              value={selectedIndex}
              onChange={setSelectedIndex}
            />
          )}
          <Text.S
            align="center"
            style={styles.keyValue}
            testID="account-key-sheet-public-key">
            {selectedKey}
          </Text.S>
          <Button.Secondary
            label={copyButtonLabel}
            onPress={() => {
              onCopy(selectedKey);
            }}
            preIconName="Copy"
            iconColor={theme.text.primary}
            testID={copyButtonTestID}
          />
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        secondaryButton={
          shouldShowShareButton
            ? {
                label: shareButtonLabel,
                onPress: () => {
                  onShare(selectedKey);
                },
                preIconName: 'Share',
                testID: shareButtonTestID,
              }
            : undefined
        }
        primaryButton={{
          label: doneButtonLabel,
          onPress: onDone,
          testID: doneButtonTestID,
        }}
      />
    </>
  );
};

const getStyles = ({ footerHeight }: { footerHeight: number }) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom: footerHeight,
    },
    content: {
      paddingHorizontal: spacing.M,
      paddingBottom: spacing.M,
    },
    keyValue: {
      width: '100%',
    },
  });
