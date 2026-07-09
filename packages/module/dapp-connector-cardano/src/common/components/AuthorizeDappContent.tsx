import { resolveAccountNameSuffix } from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import {
  AccountSecurityAlertInline,
  Avatar,
  Column,
  CustomTag,
  Divider,
  DropdownMenu,
  Icon,
  Link,
  Row,
  spacing,
  Text,
  TokenGroupSummary,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { useLaceSelector } from '../hooks';

import { AuthorizeDappStatusTag } from './AuthorizeDappStatusTag';

import type { AuthorizeDappStatusTagStatus } from './AuthorizeDappStatusTag';
import type { TranslationKey } from '@lace-contract/i18n';
import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { IconName } from '@lace-lib/ui-toolkit';

const AUTHORIZE_DETAILS_LABELS = [
  'network',
  'utxos',
  'balance',
  'addresses',
] as const;

export interface AuthorizeDappContentProps {
  imageUrl?: string;
  name: string;
  url: string;
  accounts: AnyAccount[];
  walletNameByWalletId: Record<string, string>;
  selectedAccount: AnyAccount | null;
  onSelectAccount: (account: AnyAccount) => void;
  category?: string;
  coinIcons?: IconName[];
  dappStatus?: AuthorizeDappStatusTagStatus;
  selectedAccountBalance?: string;
}

const formatAccountLabel = (
  account: AnyAccount,
  walletNameByWalletId: Record<string, string>,
  compromisedSuffixByAccount: Record<string, string>,
): { text: string; subText?: string } => ({
  text: `${account.metadata.name}${
    compromisedSuffixByAccount[account.accountId] ?? ''
  }`,
  subText: walletNameByWalletId[account.walletId],
});

export const AuthorizeDappContent = ({
  imageUrl,
  name,
  url,
  accounts,
  walletNameByWalletId,
  selectedAccount,
  onSelectAccount,
  category,
  coinIcons,
  dappStatus = 'trusted',
  selectedAccountBalance = '',
}: AuthorizeDappContentProps) => {
  const { t } = useTranslation();
  const styles = getStyles();

  const flaggedExploitsByAccount = useLaceSelector(
    'cardanoContext.selectFlaggedExploitsByAccount',
  );
  const { featureFlags } = useLaceSelector('features.selectLoadedFeatures');

  const compromisedSuffixByAccount = useMemo(() => {
    const result: Record<string, string> = {};
    for (const account of accounts) {
      const suffixInfo = resolveAccountNameSuffix(
        flaggedExploitsByAccount[account.accountId] ?? [],
        featureFlags,
      );
      if (suffixInfo) {
        // Dropdown items are inline text (only the selected account gets a
        // pill below); wrap the label in brackets so the flagged
        // affordance stays legible in the plain-text row.
        result[account.accountId] = ` [${
          suffixInfo.override ?? t(suffixInfo.copyKey as TranslationKey)
        }]`;
      }
    }
    return result;
  }, [accounts, flaggedExploitsByAccount, featureFlags, t]);

  const dropdownItems = useMemo(
    () =>
      accounts.map(account => {
        const { text, subText } = formatAccountLabel(
          account,
          walletNameByWalletId,
          compromisedSuffixByAccount,
        );
        return {
          id: account.accountId,
          text,
          subText,
          avatar: account.metadata.avatarUri
            ? {
                img: { uri: account.metadata.avatarUri },
                fallback: account.metadata.name.substring(0, 2).toUpperCase(),
              }
            : {
                fallback: account.metadata.name.substring(0, 2).toUpperCase(),
              },
        };
      }),
    [accounts, walletNameByWalletId, compromisedSuffixByAccount],
  );

  const selectedAccountLabel = useMemo(
    () =>
      selectedAccount
        ? formatAccountLabel(
            selectedAccount,
            walletNameByWalletId,
            compromisedSuffixByAccount,
          )
        : undefined,
    [selectedAccount, walletNameByWalletId, compromisedSuffixByAccount],
  );

  const titleAvatar = useMemo(() => {
    if (!selectedAccount) return undefined;
    const fallback = selectedAccount.metadata.name
      .substring(0, 2)
      .toUpperCase();
    return selectedAccount.metadata.avatarUri
      ? {
          img: { uri: selectedAccount.metadata.avatarUri },
          fallback,
        }
      : { fallback };
  }, [selectedAccount]);

  const handleSelectAccount = useCallback(
    (index: number) => {
      const account = accounts[index];
      if (account) {
        onSelectAccount(account);
      }
    },
    [accounts, onSelectAccount],
  );

  const dappIcon = useMemo(
    () =>
      imageUrl
        ? { img: { uri: imageUrl } }
        : { fallback: name.charAt(0).toUpperCase() },
    [imageUrl, name],
  );

  const coinIconsTokens: Array<{ name: string; icon: React.ReactElement }> =
    useMemo(() => {
      if (!Array.isArray(coinIcons) || coinIcons.length === 0) return [];
      return coinIcons.map(iconName => ({
        name: iconName,
        icon: <Icon name={iconName} size={12} />,
      }));
    }, [coinIcons]);

  const handleOpenOrigin = useCallback(() => {
    const href =
      url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
    void Linking.openURL(href);
  }, [url]);

  return (
    <Column gap={spacing.L}>
      <Column gap={spacing.M}>
        <Column alignItems="center">
          <CustomTag
            size="S"
            color="white"
            icon={<Icon name="ShareVertical" size={16} />}
            label={t('dapp-connector.cardano.authorize.source-account')}
            testID="authorize-dapp-source-account"
          />
        </Column>
        <Row>
          <DropdownMenu
            items={dropdownItems}
            title={
              selectedAccountLabel?.text ??
              t('dapp-connector.cardano.connect.account-label')
            }
            titleSubText={selectedAccountLabel?.subText}
            titleAvatar={titleAvatar}
            actionText={selectedAccountBalance}
            onSelectItem={handleSelectAccount}
            selectedItemId={selectedAccount?.accountId}
            truncateText
          />
        </Row>
        {selectedAccount ? (
          <AccountSecurityAlertInline accountId={selectedAccount.accountId} />
        ) : null}
      </Column>

      <Divider />

      {/* DApp Section */}
      <Column>
        <Row style={styles.dappRow} alignItems="center">
          <Row style={styles.dappLeftPart} alignItems="center" gap={spacing.S}>
            <Avatar size={48} content={dappIcon} shape="squared" />
            <Column style={styles.dappInfo}>
              <Text.XS numberOfLines={1}>{name}</Text.XS>
              <Text.XS
                variant="secondary"
                style={styles.dappCategory}
                numberOfLines={1}>
                {category ?? 'DApp'}
              </Text.XS>
            </Column>
          </Row>
          {coinIconsTokens.length > 0 && (
            <TokenGroupSummary
              tokens={coinIconsTokens}
              type="tokens"
              size={24}
              hideTokensLabel
            />
          )}
        </Row>
        {Boolean(url) && (
          <Link
            label={url}
            onPress={handleOpenOrigin}
            textStyle={styles.originLink}
          />
        )}
      </Column>

      <Column alignItems="center">
        <AuthorizeDappStatusTag status={dappStatus} />
      </Column>

      <Divider />

      {/* Details Section */}
      <Column gap={spacing.S}>
        <Text.S variant="secondary">
          {t('dapp-connector.cardano.authorize.allow-title')}
        </Text.S>
        <Column gap={spacing.XS}>
          {AUTHORIZE_DETAILS_LABELS.map(labelKey => (
            <Row
              key={labelKey}
              style={styles.detailsBulletRow}
              alignItems="center"
              gap={spacing.S}>
              <Text.S style={styles.detailsBullet}>•</Text.S>
              <Text.XS style={styles.detailsBulletText}>
                {t(`dapp-connector.cardano.authorize.details.${labelKey}`)}
              </Text.XS>
            </Row>
          ))}
        </Column>
      </Column>
    </Column>
  );
};

const getStyles = () =>
  StyleSheet.create({
    dappRow: {
      alignItems: 'center',
      marginBottom: spacing.M,
    },
    dappLeftPart: {
      flex: 1,
      minWidth: 0,
    },
    dappInfo: {
      flex: 1,
      minWidth: 0,
    },
    dappCategory: {
      alignSelf: 'stretch',
    },
    detailsBulletRow: {
      alignSelf: 'stretch',
      paddingLeft: spacing.S,
    },
    detailsBullet: {
      lineHeight: undefined,
    },
    detailsBulletText: {
      flex: 1,
    },
    originLink: {
      fontSize: 14,
      lineHeight: 18,
    },
  });
