import { useTranslation } from '@lace-contract/i18n';
import {
  AccountSecurityAlertInline,
  Avatar,
  Column,
  CustomTag,
  Divider,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { SignMessageAccountInfo } from '../hooks/useSignMessageAccountInfo';
import type { BitcoinSignatureType } from '@lace-contract/bitcoin-context';
import type { AvatarContent } from '@lace-lib/ui-toolkit';

export interface SignMessageContentDapp {
  icon: AvatarContent;
  name?: string;
  origin: string;
}

export interface SignMessageContentProps {
  dapp: SignMessageContentDapp;
  address: string;
  accountInfo?: SignMessageAccountInfo;
  message: string;
  signatureType: BitcoinSignatureType;
}

/**
 * Sign message review content: the requesting dApp, the signing account, the
 * full signing address, the requested signature scheme, and the full message
 * text, verbatim and scrollable so nothing the dApp asks to sign is hidden by
 * truncation.
 */
export const SignMessageContent = ({
  dapp,
  address,
  accountInfo,
  message,
  signatureType,
}: SignMessageContentProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const signatureTypeLabel =
    signatureType === 'bip322-simple'
      ? t('dapp-connector.bitcoin.sign-message.signature-type.bip322')
      : t('dapp-connector.bitcoin.sign-message.signature-type.ecdsa');

  return (
    <Column gap={spacing.L}>
      <Row style={styles.dappRow} alignItems="center">
        <Row style={styles.dappLeftPart} alignItems="center" gap={spacing.S}>
          <Avatar size={48} content={dapp.icon} shape="squared" />
          <Column style={styles.dappInfo}>
            <Text.XS numberOfLines={1}>{dapp.name}</Text.XS>
            <Text.XS variant="secondary" numberOfLines={1}>
              {dapp.origin}
            </Text.XS>
          </Column>
        </Row>
      </Row>
      <Divider />
      {accountInfo && (
        <Column gap={spacing.L}>
          <Row justifyContent="space-between" testID="sign-message-account">
            <Text.XS variant="secondary">
              {t('dapp-connector.bitcoin.sign-message.account-label')}
            </Text.XS>
            <CustomTag
              size="M"
              label={accountInfo.name}
              testID="sign-message-account-name"
              icon={
                <Avatar
                  size={24}
                  shape="rounded"
                  content={
                    accountInfo.avatarUri
                      ? {
                          img: { uri: accountInfo.avatarUri },
                          fallback: accountInfo.name
                            .substring(0, 2)
                            .toUpperCase(),
                        }
                      : {
                          fallback: accountInfo.name
                            .substring(0, 2)
                            .toUpperCase(),
                        }
                  }
                />
              }
              color="white"
            />
          </Row>
          <AccountSecurityAlertInline accountId={accountInfo.accountId} />
        </Column>
      )}
      <Row justifyContent="space-between" testID="sign-message-signature-type">
        <Text.XS variant="secondary">
          {t('dapp-connector.bitcoin.sign-message.signature-type-label')}
        </Text.XS>
        <CustomTag
          size="M"
          label={signatureTypeLabel}
          testID="sign-message-signature-type-tag"
          color="white"
        />
      </Row>
      <Divider />
      <View style={styles.addressContainer} testID="sign-message-address">
        <Text.XS variant="secondary">
          {t('dapp-connector.bitcoin.address-label')}
        </Text.XS>
        <Text.S style={styles.addressText} selectable>
          {address}
        </Text.S>
      </View>
      <View style={styles.messageContainer} testID="sign-message-message">
        <Text.XS variant="secondary">
          {t('dapp-connector.bitcoin.sign-message.message-label')}
        </Text.XS>
        <ScrollView style={styles.messageScroll} nestedScrollEnabled>
          <Text.S style={styles.messageText} selectable>
            {message}
          </Text.S>
        </ScrollView>
      </View>
    </Column>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    dappRow: {
      alignItems: 'center',
    },
    dappLeftPart: {
      flex: 1,
      minWidth: 0,
    },
    dappInfo: {
      flex: 1,
      minWidth: 0,
    },
    addressContainer: {
      backgroundColor: theme.background.secondary,
      borderRadius: 16,
      padding: spacing.M,
    },
    addressText: {
      fontFamily: 'monospace',
    },
    messageContainer: {
      backgroundColor: theme.background.secondary,
      borderRadius: 16,
      padding: spacing.M,
    },
    messageScroll: {
      maxHeight: 200,
    },
    messageText: {
      fontFamily: 'monospace',
    },
  });
