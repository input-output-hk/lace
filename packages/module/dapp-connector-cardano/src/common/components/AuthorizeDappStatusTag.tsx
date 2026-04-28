import { useTranslation } from '@lace-contract/i18n';
import { CustomTag, hexToRgba, Icon, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';

export type AuthorizeDappStatusTagStatus = 'blocked' | 'trusted' | 'unsecured';

type AuthorizeDappStatusTagProps = {
  status: AuthorizeDappStatusTagStatus;
};

export const AuthorizeDappStatusTag = ({
  status,
}: AuthorizeDappStatusTagProps) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (status === 'trusted') {
    return (
      <CustomTag
        size="M"
        color="positive"
        backgroundType="colored"
        backgroundColor={hexToRgba(theme.background.positive, 0.2)}
        labelColor={theme.data.positive}
        icon={
          <Icon name="SecurityCheck" size={24} color={theme.data.positive} />
        }
        label={t('dapp-connector.cardano.authorize.status.trusted')}
        testID="authorize-dapp-status-trusted"
      />
    );
  }

  if (status === 'blocked') {
    return (
      <CustomTag
        size="M"
        color="negative"
        backgroundType="colored"
        backgroundColor={hexToRgba(theme.data.negative, 0.2)}
        labelColor={theme.data.negative}
        icon={<Icon name="ThumbsDown" size={24} color={theme.data.negative} />}
        label={t('dapp-connector.cardano.authorize.status.blocked')}
        testID="authorize-dapp-status-blocked"
      />
    );
  }

  return (
    <CustomTag
      size="M"
      backgroundType="colored"
      backgroundColor={hexToRgba(theme.brand.yellow, 0.2)}
      labelColor={theme.brand.yellow}
      icon={<Icon name="AlertTriangle" size={24} color={theme.brand.yellow} />}
      label={t('dapp-connector.cardano.authorize.status.unsecured')}
      trailingIcon={
        <Icon name="InformationCircle" size={14} color={theme.brand.yellow} />
      }
      testID="authorize-dapp-status-unsecured"
    />
  );
};
