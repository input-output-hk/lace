import { useTranslation } from '@lace-contract/i18n';
import {
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

import { safeAddrToSignWith } from '../../store/util';
import { formatSignDataPayload } from '../../utils/sign-data-payload';

import type { SignDataDisplayDapp } from './types';
import type { SignDataAccountInfo } from '../../types/sign-data-account';

export interface SignDataContentProps {
  dapp: SignDataDisplayDapp;
  accountInfo?: SignDataAccountInfo;
  address: string;
  payload: string;
}

export const SignDataContent = ({
  dapp,
  accountInfo,
  address,
  payload,
}: SignDataContentProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const displayPayload = useMemo(
    () => formatSignDataPayload(payload),
    [payload],
  );

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
          <Row justifyContent="space-between" testID="sign-data-account">
            <Text.XS variant="secondary">
              {t('dapp-connector.cardano.sign-tx.account-label')}
            </Text.XS>
            <CustomTag
              size="M"
              label={accountInfo.name}
              testID="sign-data-account-name"
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
          <Divider />
        </Column>
      )}

      <View style={styles.preContainer} testID="sign-data-address">
        <Text.XS variant="secondary">
          {t('dapp-connector.cardano.sign-data.address-label')}
        </Text.XS>
        <Text.S style={styles.preText} selectable>
          {safeAddrToSignWith(address)}
        </Text.S>
      </View>

      <View style={styles.dataContainer} testID="sign-data-data">
        <ScrollView style={styles.dataScroll} nestedScrollEnabled>
          <Text.XS variant="secondary">
            {t('dapp-connector.cardano.sign-data.payload-label')}
          </Text.XS>
          <Text.S style={styles.preText} selectable>
            {displayPayload}
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
    preContainer: {
      backgroundColor: theme.background.secondary,
      borderRadius: 16,
      padding: spacing.M,
    },
    dataContainer: {
      backgroundColor: theme.background.secondary,
      borderRadius: 16,
      padding: spacing.M,
      maxHeight: 200,
    },
    dataScroll: {
      maxHeight: 184,
    },
    preText: {
      fontFamily: 'monospace',
    },
  });
