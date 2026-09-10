import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import {
  Column,
  DappInfoCard,
  DropdownMenu,
  Row,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { WarningBanner } from './WarningBanner';

import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Props for the connect/authorize review body.
 */
export interface AuthorizeDappBodyProps {
  imageUrl?: string;
  name: string;
  url: string;
  accounts: AnyAccount[];
  walletNameByWalletId: Record<string, string>;
  selectedAccount: AnyAccount | null;
  onSelectAccount: (account: AnyAccount) => void;
  showTitle?: boolean;
}

/**
 * Props for the connect/authorize review content.
 */
export interface AuthorizeDappContentProps extends AuthorizeDappBodyProps {
  onAuthorize: () => void;
  onCancel: () => void;
}

const PERMISSION_KEYS = [
  'dapp-connector.connect-dapp.description1',
  'dapp-connector.connect-dapp.description2',
  'dapp-connector.connect-dapp.description3',
] as const;

/**
 * Connect/authorize review body: the requesting dApp, an account picker and the
 * permissions granted. Rendered inside the popup chrome or a side panel sheet,
 * each of which supplies its own confirm and cancel controls.
 */
export const AuthorizeDappBody = ({
  imageUrl,
  name,
  url,
  accounts,
  walletNameByWalletId,
  selectedAccount,
  onSelectAccount,
  showTitle = true,
}: AuthorizeDappBodyProps) => {
  const { t } = useTranslation();

  const accountItems = useMemo(
    () =>
      accounts.map(account => {
        const fallback = account.metadata.name.substring(0, 2).toUpperCase();
        return {
          id: account.accountId,
          text: account.metadata.name,
          subText: walletNameByWalletId[account.walletId],
          avatar: account.metadata.avatarUri
            ? { img: { uri: account.metadata.avatarUri }, fallback }
            : { fallback },
        };
      }),
    [accounts, walletNameByWalletId],
  );

  const handleSelectAccount = useCallback(
    (index: number) => {
      const account = accounts[index];
      if (account) onSelectAccount(account);
    },
    [accounts, onSelectAccount],
  );

  return (
    <React.Fragment>
      {showTitle ? (
        <View style={styles.titleContainer}>
          <Text.M>{t('dapp-connector.connect-dapp.title')}</Text.M>
        </View>
      ) : null}
      <DappInfoCard imageUrl={imageUrl} name={name} url={url} />
      <View style={styles.section}>
        <DropdownMenu
          items={accountItems}
          title={
            selectedAccount?.metadata.name ??
            t('dapp-connector.connect-dapp.account-label')
          }
          onSelectItem={handleSelectAccount}
          selectedItemId={selectedAccount?.accountId}
          truncateText
        />
      </View>
      <WarningBanner
        message={t('dapp-connector.connect-dapp.info')}
        testID="bitcoin-dapp-connect-info-bar"
      />
      <Text.M
        style={styles.descriptionHeading}
        testID="bitcoin-dapp-connect-description-heading">
        {t('dapp-connector.connect-dapp.description-heading')}
      </Text.M>
      <Column gap={spacing.S} testID="bitcoin-dapp-connect-description-list">
        {PERMISSION_KEYS.map((key, index) => (
          <Row
            key={key}
            alignItems="flex-start"
            gap={spacing.S}
            testID={`bitcoin-dapp-connect-permission-${index + 1}`}>
            <Text.S>{'\u2022'}</Text.S>
            <Text.S>{t(key)}</Text.S>
          </Row>
        ))}
      </Column>
    </React.Fragment>
  );
};

/**
 * Connect/authorize review content in the popup window chrome: the review body
 * plus Authorize/Cancel actions. Authorize is disabled until the user picks an
 * account.
 */
export const AuthorizeDappContent = ({
  onAuthorize,
  onCancel,
  ...bodyProps
}: AuthorizeDappContentProps) => {
  const { t } = useTranslation();

  return (
    <DappConnectorLayoutV2
      fillViewport
      primaryButton={{
        label: t('dapp-connector.connect-dapp.authorize'),
        action: onAuthorize,
        disabled: !bodyProps.selectedAccount,
      }}
      secondaryButton={{
        label: t('dapp-connector.connect-dapp.cancel'),
        action: onCancel,
      }}>
      <AuthorizeDappBody {...bodyProps} />
    </DappConnectorLayoutV2>
  );
};

const styles = StyleSheet.create({
  titleContainer: { width: '100%', marginBottom: spacing.M },
  section: { marginVertical: spacing.M },
  descriptionHeading: { marginTop: spacing.M, marginBottom: spacing.S },
});
