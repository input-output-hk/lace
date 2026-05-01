import type { ReactNode } from 'react';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import {
  type AccountData,
  type AssetToSend,
  type FeeEntry,
} from '../../../../utils/sendSheetUtils';
import { Column } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import {
  AccountSelector,
  NoteSection,
  SummarySection,
  RecipientInput,
  AssetsSection,
} from './components';

import type { Theme } from '../../../../design-tokens';
import type { AccountId } from '@lace-contract/wallet-repo';

interface SheetTextProps {
  headerTitle: string;
  sourceAccountLabel: string;
  accountDropdownTitle: string;
  recipientLabel: string;
  assetsTitle: string;
  noteLabel: string;
  estimatedFeeLabel: string;
  reviewTransactionLabel: string;
  accountText: string;
  customFeeLabel: string;
  balanceLabel: string;
  assetErrors: string[];
  addButtonLabel: string;
  maxButtonLabel: string;
}

interface SheetValuesProps {
  selectedAccountId: AccountId | null;
  estimatedFee: FeeEntry[];
  noteValue: string;
  accounts: AccountData[];
  assetsToSend: AssetToSend[];
  addressSelected?: string;
  assetInputValues: { tokenId: string; value: string }[];
}

interface SheetUtilsProps {
  recipientErrorMessage?: string;
  txBuildError?: string;
  isReviewTransactionEnabled: boolean;
  isAddAssetButtonEnabled: boolean;
  noteSectionLength: number;
  shouldShowNoteSection?: boolean;
  shouldShowMaxButton?: (tokenId: string) => boolean;
  /** When false for an index, the remove (trash) control is hidden for that amount row (e.g. primary asset). */
  shouldShowRemoveAsset?: (index: number) => boolean;
  shouldShowFiatConversion?: boolean;
  NoticeComponent?: React.ComponentType;
  theme: Theme;
  /** Optional fee section component (e.g. from Bitcoin send-flow customization). Self-contained, no props. */
  FeeSection?: React.ComponentType;
}

interface SheetActionsProps {
  onQrCodePress: () => void;
  onContactsPress: () => void;
  onAddAssetPress: () => void;
  onRemoveAsset: (tokenId: string) => void;
  onMaxAmountPress: (index: number) => void;
  onNoteChange: (value: string) => void;
  onClearNote: () => void;
  onReviewTransactionPress: () => void;
  onSelectAccount: (accountId: AccountId) => void;
  handleInputChange: (index: number, value: string) => void;
  onRecipientAddressChange: (value: string) => void;
}

export interface SendSheetProps {
  copies: SheetTextProps;
  values: SheetValuesProps;
  utils: SheetUtilsProps;
  actions: SheetActionsProps;
  /** Optional footer title row content (e.g. from send-flow sheet UI customisation). Rendered below divider with transparent background. */
  sheetFooterTitleRow?: ReactNode;
}

export const SendSheet = ({
  copies,
  values,
  utils,
  actions,
  sheetFooterTitleRow,
}: SendSheetProps) => {
  const { headerTitle, reviewTransactionLabel } = copies;
  const {
    isReviewTransactionEnabled,
    noteSectionLength,
    shouldShowNoteSection,
    NoticeComponent,
    FeeSection,
  } = utils;
  const { onReviewTransactionPress } = actions;

  const summaryValues = useMemo(
    () => ({ estimatedFee: values.estimatedFee }),
    [values.estimatedFee],
  );

  const footerHeight = useFooterHeight();
  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  const footerPrimaryButton = useMemo(
    () => ({
      label: reviewTransactionLabel,
      onPress: onReviewTransactionPress,
      disabled: !isReviewTransactionEnabled,
      testID: 'send-form-review-transaction-button' as const,
    }),
    [
      reviewTransactionLabel,
      onReviewTransactionPress,
      isReviewTransactionEnabled,
    ],
  );

  return (
    <>
      <SheetHeader title={headerTitle} testID="send-form-header" />
      <Sheet.Scroll
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}>
        <Column
          justifyContent="space-between"
          gap={spacing.M}
          style={styles.content}>
          <Column style={styles.section}>
            <AccountSelector
              copies={copies}
              values={values}
              actions={actions}
              testIdPrefix="send-form"
            />
            <RecipientInput
              copies={copies}
              values={values}
              utils={utils}
              actions={actions}
              testIdPrefix="send-form"
            />
            <AssetsSection
              copies={copies}
              values={values}
              utils={utils}
              actions={actions}
            />
            {shouldShowNoteSection && (
              <NoteSection
                copies={copies}
                values={values}
                actions={actions}
                length={noteSectionLength}
                testIdPrefix="send-form"
              />
            )}

            {FeeSection && <FeeSection />}

            {NoticeComponent && <NoticeComponent />}

            <SummarySection
              copies={copies}
              values={summaryValues}
              utils={utils}
              testIdPrefix="send-form"
            />
          </Column>
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        titleRow={sheetFooterTitleRow}
        primaryButton={footerPrimaryButton}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.XL,
  },
  section: {
    gap: spacing.XL,
  },
});
