import type { TextStyle } from 'react-native';

import { useAnalytics } from '@lace-contract/analytics';
import { useConfig } from '@lace-contract/app';
import {
  toExternalUrl,
  toHttpImageUrl,
} from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import {
  Avatar,
  Column,
  footerHeight,
  Icon,
  Row,
  spacing,
  Text,
  Sheet,
  useCopyToClipboard,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';

import { useLaceSelector } from '../../hooks';

import { useDRepDetails } from './useDRepDetails';

import type { DRepReference } from '@lace-contract/cardano-context';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const ADA_DECIMALS = 6;
const DISPLAY_DECIMALS = 2;

// wordBreak is web-only; RN types don't include it but RN Web supports it.
// Without it, unbroken strings (bech32 ids, addresses, hashes) clip at the
// edge on web instead of wrapping.
const breakAllStyle = { wordBreak: 'break-all' } as TextStyle;

const Section = ({
  label,
  value,
  testID,
  breakValue = false,
}: {
  label: string;
  value?: string;
  testID: string;
  /** For unbroken machine values (urls, hashes) that must wrap, not clip. */
  breakValue?: boolean;
}) => {
  if (value === undefined) return null;
  return (
    <Column gap={spacing.XS}>
      <Text.M variant="secondary">{label}</Text.M>
      <Text.S style={breakValue ? breakAllStyle : undefined} testID={testID}>
        {value}
      </Text.S>
    </Column>
  );
};

const CopyableId = ({
  label,
  value,
  testID,
}: {
  label: string;
  value?: string;
  testID: string;
}) => {
  const { copyToClipboard } = useCopyToClipboard();

  const handleCopy = useCallback(() => {
    if (value !== undefined) copyToClipboard(value);
  }, [copyToClipboard, value]);

  if (value === undefined) return null;
  return (
    <Column gap={spacing.XS}>
      <Text.M variant="secondary">{label}</Text.M>
      <Row alignItems="center" gap={spacing.S}>
        <Text.S style={[styles.idValue, breakAllStyle]} testID={testID}>
          {value}
        </Text.S>
        <Pressable onPress={handleCopy} testID={`${testID}-copy`}>
          <Icon name="Copy" size={20} />
        </Pressable>
      </Row>
    </Column>
  );
};

const ReferenceRow = ({
  reference,
  index,
  onOpen,
}: {
  reference: DRepReference;
  index: number;
  onOpen: (uri: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onOpen(reference.uri);
  }, [onOpen, reference.uri]);

  return (
    <Pressable onPress={handlePress} testID={`drep-details-reference-${index}`}>
      <Column gap={0}>
        {reference.label !== undefined && <Text.S>{reference.label}</Text.S>}
        <Text.XS variant="secondary" style={breakAllStyle}>
          {reference.uri}
        </Text.XS>
      </Column>
    </Pressable>
  );
};

export const DRepDetailsSheet = (
  props: SheetScreenProps<SheetRoutes.DRepDetails>,
) => {
  const { accountId, drepId } = props.route.params;
  const { navigation } = props;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { onDelegate, summary } = useDRepDetails(accountId, drepId);
  const metadata = summary?.metadata;
  const avatarUri = toHttpImageUrl(metadata?.imageUrl);
  const votingPowerLabel = t('v2.governance.drep-details.voting-power');

  const { appConfig } = useConfig();
  const chainId = useLaceSelector('cardanoContext.selectChainId');
  const explorerBaseUrl =
    chainId && appConfig?.cexplorerUrls
      ? appConfig.cexplorerUrls[chainId.networkMagic] ?? ''
      : '';

  const handleDelegate = useCallback(() => {
    trackEvent('governance | drep | stake | press');
    onDelegate();
  }, [onDelegate, trackEvent]);

  // Header and footer go through navigation options (not inline siblings of
  // Sheet.Scroll) so the sheet bounds the scrollable's height — mirrors
  // StakePoolDetailsSheet, whose content scrolls correctly on all platforms.
  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={t('v2.governance.drep-details.title')} />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.governance.drep-details.button.select'),
            onPress: handleDelegate,
            testID: 'drep-details-select-button',
          }}
        />
      ),
    });
  }, [navigation, t, handleDelegate]);

  const handleOpenReference = useCallback((uri: string) => {
    const url = toExternalUrl(uri);
    if (url !== undefined) void Linking.openURL(url);
  }, []);

  const paymentAddress = metadata?.paymentAddress;
  const handleOpenPaymentAddress = useCallback(() => {
    if (!explorerBaseUrl || paymentAddress === undefined) return;
    void Linking.openURL(`${explorerBaseUrl}/address/${paymentAddress}`);
  }, [explorerBaseUrl, paymentAddress]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.content}>
      {summary && (
        <Column alignItems="center" gap={spacing.S}>
          <Avatar
            size={64}
            shape="rounded"
            content={{
              ...(avatarUri !== undefined && {
                img: { uri: avatarUri },
              }),
            }}
            fallbackIcon="User"
            testID="drep-details-avatar"
          />
          {summary.name !== undefined && (
            <Text.M testID="drep-details-name">{summary.name}</Text.M>
          )}
          <Text.XS variant="secondary" testID="drep-details-status">
            {summary.isActive
              ? t('v2.governance.drep-details.status.active')
              : t('v2.governance.drep-details.status.inactive')}
          </Text.XS>
          <Text.XS variant="secondary" testID="drep-details-voting-power">
            {votingPowerLabel}: ₳{' '}
            {formatAmountToLocale(
              summary.amount,
              ADA_DECIMALS,
              DISPLAY_DECIMALS,
            )}
          </Text.XS>
        </Column>
      )}
      <Section
        label={t('v2.governance.drep-details.bio')}
        value={metadata?.bio}
        testID="drep-details-bio"
      />
      <Section
        label={t('v2.governance.drep-details.objectives')}
        value={metadata?.objectives}
        testID="drep-details-objectives"
      />
      <Section
        label={t('v2.governance.drep-details.motivations')}
        value={metadata?.motivations}
        testID="drep-details-motivations"
      />
      <Section
        label={t('v2.governance.drep-details.qualifications')}
        value={metadata?.qualifications}
        testID="drep-details-qualifications"
      />
      <Section
        label={t('v2.governance.drep-details.email')}
        value={metadata?.email}
        testID="drep-details-email"
      />
      {paymentAddress !== undefined && (
        <Column gap={spacing.XS}>
          <Text.M variant="secondary">
            {t('v2.governance.drep-details.payment-address')}
          </Text.M>
          <Pressable
            onPress={handleOpenPaymentAddress}
            disabled={!explorerBaseUrl}
            testID="drep-details-payment-address">
            <Text.S style={breakAllStyle}>{paymentAddress}</Text.S>
          </Pressable>
        </Column>
      )}
      <CopyableId
        label={t('v2.governance.drep-details.id')}
        value={drepId}
        testID="drep-details-id"
      />
      <CopyableId
        label={t('v2.governance.drep-details.legacy-id')}
        value={summary?.cip105DrepId}
        testID="drep-details-legacy-id"
      />
      <Section
        label={t('v2.governance.drep-details.metadata-url')}
        value={metadata?.metadataUrl}
        testID="drep-details-metadata-url"
        breakValue
      />
      <Section
        label={t('v2.governance.drep-details.metadata-hash')}
        value={metadata?.metadataHash}
        testID="drep-details-metadata-hash"
        breakValue
      />
      {metadata?.references !== undefined && (
        <Column gap={spacing.S}>
          <Text.M variant="secondary">
            {t('v2.governance.drep-details.references')}
          </Text.M>
          {metadata.references.map((reference, index) => (
            <ReferenceRow
              key={`${reference.uri}-${index}`}
              reference={reference}
              index={index}
              onOpen={handleOpenReference}
            />
          ))}
        </Column>
      )}
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.L,
    gap: spacing.L,
    paddingBottom: footerHeight.horizontal,
  },
  idValue: {
    flex: 1,
  },
});
