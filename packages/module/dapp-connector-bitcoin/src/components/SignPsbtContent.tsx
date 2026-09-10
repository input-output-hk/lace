import { useTranslation } from '@lace-contract/i18n';
import {
  AccountSecurityAlertInline,
  Column,
  CustomTag,
  Divider,
  Icon,
  Row,
  spacing,
  Text,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { CollapsibleSection } from './CollapsibleSection';
import { formatSats, formatSignedSatsAsBtc, truncateAddress } from './format';
import { InfoRow } from './InfoRow';
import { WarningBanner } from './WarningBanner';

import type { AccountId } from '@lace-contract/wallet-repo';
import type {
  PsbtInspectionInput,
  PsbtInspectionOutput,
  PsbtInspection,
} from '@lace-lib/bitcoin-psbt';

export interface SignPsbtContentDapp {
  name?: string;
  origin: string;
}

export interface SignPsbtContentProps {
  dapp: SignPsbtContentDapp;
  inspection: PsbtInspection;
  rawPsbtBase64: string;
  currentIndex: number;
  totalCount: number;
  onPagerChange: (index: number) => void;
  /** Account id of the wallet account that would sign this PSBT.
   *  When set, an `AccountSecurityAlertInline` renders at the top of the
   *  review so the user is warned before authorizing a signature from a
   *  compromised key. Undefined suppresses the alert. */
  accountId?: AccountId;
}

type AddressGroup<Item> = {
  address?: string;
  isOwn: boolean;
  items: Item[];
};

const groupByAddress = <Item extends { address?: string; isOwn: boolean }>(
  items: Item[],
): AddressGroup<Item>[] => {
  const groups: AddressGroup<Item>[] = [];
  const groupByKey = new Map<string, AddressGroup<Item>>();
  items.forEach((item, index) => {
    const key = item.address ?? `unresolved-${index}`;
    let group = groupByKey.get(key);
    if (!group) {
      group = { address: item.address, isOwn: item.isOwn, items: [] };
      groupByKey.set(key, group);
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
};

/**
 * Sign PSBT review content: origin, the batch pager, the balance-change
 * summary, fee, security warnings, per-address From/To breakdowns, and the
 * raw PSBT. Renders one PsbtInspection at a time, matching whichever PSBT
 * the pager currently selects.
 */
export const SignPsbtContent = ({
  dapp,
  inspection,
  rawPsbtBase64,
  currentIndex,
  totalCount,
  onPagerChange,
  accountId,
}: SignPsbtContentProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const [isCopied, setIsCopied] = useState(false);
  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    },
  });
  const handleCopyRawPsbt = useCallback(() => {
    copyToClipboard(rawPsbtBase64);
  }, [copyToClipboard, rawPsbtBase64]);

  const inputGroups = useMemo(
    () => groupByAddress<PsbtInspectionInput>(inspection.inputs),
    [inspection.inputs],
  );
  const outputGroups = useMemo(
    () => groupByAddress<PsbtInspectionOutput>(inspection.outputs),
    [inspection.outputs],
  );

  const feeValue =
    inspection.fee === undefined
      ? t('dapp-connector.bitcoin.sign-psbt.fee-unverified')
      : `${formatSats(inspection.fee)} sats`;

  return (
    <Column gap={spacing.L}>
      {accountId ? <AccountSecurityAlertInline accountId={accountId} /> : null}
      <InfoRow
        label={t('dapp-connector.bitcoin.origin-label')}
        value={<CustomTag color="white" label={dapp.origin} />}
        alignItems="center"
        testID="sign-psbt-origin"
      />
      <Divider />

      {totalCount > 1 && (
        <>
          <Row
            alignItems="center"
            justifyContent="space-between"
            testID="sign-psbt-pager">
            <Pressable
              onPress={() => {
                onPagerChange(currentIndex - 1);
              }}
              disabled={currentIndex === 0}
              testID="sign-psbt-pager-prev">
              <Icon
                name="CaretLeft"
                size={20}
                color={
                  currentIndex === 0 ? theme.text.secondary : theme.text.primary
                }
              />
            </Pressable>
            <Text.XS testID="sign-psbt-pager-label">
              {t('dapp-connector.bitcoin.sign-psbt.pager-label', {
                current: currentIndex + 1,
                total: totalCount,
              })}
            </Text.XS>
            <Pressable
              onPress={() => {
                onPagerChange(currentIndex + 1);
              }}
              disabled={currentIndex === totalCount - 1}
              testID="sign-psbt-pager-next">
              <Icon
                name="CaretRight"
                size={20}
                color={
                  currentIndex === totalCount - 1
                    ? theme.text.secondary
                    : theme.text.primary
                }
              />
            </Pressable>
          </Row>
          <Divider />
        </>
      )}

      <CollapsibleSection
        title={t('dapp-connector.bitcoin.sign-psbt.summary-label')}
        defaultOpen
        testID="sign-psbt-summary">
        <InfoRow
          label={t('dapp-connector.bitcoin.sign-psbt.balance-change-label')}
          value={
            inspection.netBalanceChange === undefined
              ? t('dapp-connector.bitcoin.sign-psbt.unknown-value')
              : `${formatSignedSatsAsBtc(inspection.netBalanceChange)} BTC`
          }
          secondaryValue={
            inspection.netBalanceChange === undefined
              ? undefined
              : `${formatSats(inspection.netBalanceChange)} sats`
          }
          testID="sign-psbt-net-balance"
        />
      </CollapsibleSection>
      <Divider />

      <CollapsibleSection
        title={t('dapp-connector.bitcoin.sign-psbt.additional-info-label')}
        testID="sign-psbt-additional-info">
        <InfoRow
          label={t('dapp-connector.bitcoin.sign-psbt.fee-label')}
          value={feeValue}
          testID="sign-psbt-fee"
        />
        {inspection.estimatedFeeRate !== undefined && (
          <InfoRow
            label={t('dapp-connector.bitcoin.sign-psbt.fee-rate-label')}
            value={`${inspection.estimatedFeeRate} sat/vB`}
            testID="sign-psbt-fee-rate"
          />
        )}
      </CollapsibleSection>
      <Divider />

      {inspection.warnings.unresolvedInputValues && (
        <WarningBanner
          message={t(
            'dapp-connector.bitcoin.sign-psbt.warnings.unresolved-input-values',
          )}
          testID="sign-psbt-warning-unresolved-input-values"
        />
      )}
      {inspection.warnings.signsForeignInputs && (
        <WarningBanner
          message={t(
            'dapp-connector.bitcoin.sign-psbt.warnings.signs-foreign-inputs',
          )}
          testID="sign-psbt-warning-signs-foreign-inputs"
        />
      )}
      {inspection.warnings.nonDefaultSighash && (
        <WarningBanner
          message={t(
            'dapp-connector.bitcoin.sign-psbt.warnings.non-default-sighash',
          )}
          testID="sign-psbt-warning-non-default-sighash"
        />
      )}

      <CollapsibleSection
        title={t('dapp-connector.bitcoin.sign-psbt.from-label')}
        testID="sign-psbt-from">
        <Column gap={spacing.L}>
          {inputGroups.map((group, groupIndex) => (
            <Column
              gap={spacing.S}
              key={`from-${group.address ?? groupIndex}`}
              testID={`sign-psbt-from-address-${groupIndex}`}>
              <InfoRow
                label={t('dapp-connector.bitcoin.address-label')}
                value={
                  group.address
                    ? truncateAddress(group.address)
                    : t('dapp-connector.bitcoin.sign-psbt.unknown-address')
                }
                secondaryValue={
                  group.isOwn ? (
                    <CustomTag
                      size="S"
                      color="primary"
                      backgroundType="semiTransparent"
                      label={t('dapp-connector.bitcoin.address.own')}
                      testID={`sign-psbt-from-address-${groupIndex}-own-tag`}
                    />
                  ) : undefined
                }
                testID={`sign-psbt-from-address-${groupIndex}-value`}
              />
              {group.items.map((input, inputIndex) => (
                <InfoRow
                  key={`from-input-${input.index}`}
                  label={t('dapp-connector.bitcoin.sign-psbt.amount-label')}
                  value={
                    input.value === undefined
                      ? t('dapp-connector.bitcoin.sign-psbt.unknown-value')
                      : `${formatSats(input.value)} sats`
                  }
                  testID={`sign-psbt-from-address-${groupIndex}-input-${inputIndex}`}
                />
              ))}
              {groupIndex < inputGroups.length - 1 && <Divider />}
            </Column>
          ))}
        </Column>
      </CollapsibleSection>
      <Divider />

      <CollapsibleSection
        title={t('dapp-connector.bitcoin.sign-psbt.to-label')}
        testID="sign-psbt-to">
        <Column gap={spacing.L}>
          {outputGroups.map((group, groupIndex) => (
            <Column
              gap={spacing.S}
              key={`to-${group.address ?? groupIndex}`}
              testID={`sign-psbt-to-address-${groupIndex}`}>
              <InfoRow
                label={t('dapp-connector.bitcoin.address-label')}
                value={
                  group.address
                    ? truncateAddress(group.address)
                    : t('dapp-connector.bitcoin.sign-psbt.unknown-address')
                }
                secondaryValue={
                  group.isOwn ? (
                    <CustomTag
                      size="S"
                      color="primary"
                      backgroundType="semiTransparent"
                      label={t('dapp-connector.bitcoin.address.own')}
                      testID={`sign-psbt-to-address-${groupIndex}-own-tag`}
                    />
                  ) : undefined
                }
                testID={`sign-psbt-to-address-${groupIndex}-value`}
              />
              {group.items.map((output, outputIndex) => (
                <InfoRow
                  key={`to-output-${output.index}`}
                  label={t('dapp-connector.bitcoin.sign-psbt.amount-label')}
                  value={`${formatSats(output.value)} sats`}
                  testID={`sign-psbt-to-address-${groupIndex}-output-${outputIndex}`}
                />
              ))}
              {groupIndex < outputGroups.length - 1 && <Divider />}
            </Column>
          ))}
        </Column>
      </CollapsibleSection>
      <Divider />

      <CollapsibleSection
        title={t('dapp-connector.bitcoin.sign-psbt.raw-psbt-label')}
        testID="sign-psbt-raw-data">
        <View style={styles.rawDataContainer}>
          <Pressable
            style={styles.copyButton}
            onPress={handleCopyRawPsbt}
            testID="sign-psbt-raw-data-copy">
            <Text.S style={styles.copyButtonText}>
              {isCopied
                ? t('dapp-connector.bitcoin.sign-psbt.copied')
                : t('dapp-connector.bitcoin.sign-psbt.copy-button')}
            </Text.S>
          </Pressable>
          <ScrollView
            style={styles.rawDataScroll}
            nestedScrollEnabled
            testID="sign-psbt-raw-data-scroll">
            <Text.S style={styles.rawDataText} selectable>
              {rawPsbtBase64}
            </Text.S>
          </ScrollView>
        </View>
      </CollapsibleSection>
    </Column>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    rawDataContainer: {
      position: 'relative',
    },
    copyButton: {
      position: 'absolute',
      top: spacing.XS,
      right: spacing.XS,
      zIndex: 1,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      backgroundColor: theme.background.primary,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.border.middle,
    },
    copyButtonText: {
      color: theme.text.primary,
      fontWeight: '600',
    },
    rawDataScroll: {
      maxHeight: 200,
      backgroundColor: theme.background.secondary,
      borderRadius: 8,
      padding: spacing.M,
    },
    rawDataText: {
      fontFamily: 'monospace',
      color: theme.text.primary,
      lineHeight: 20,
    },
  });
