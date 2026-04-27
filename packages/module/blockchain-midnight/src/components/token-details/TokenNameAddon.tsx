import { useTranslation } from '@lace-contract/i18n';
import { CustomTag, Icon, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { MidnightSpecificTokenMetadata } from '@lace-contract/midnight-context';
import type { Token } from '@lace-contract/tokens';

export const TokenNameAddon = ({
  token,
}: {
  token: Token<MidnightSpecificTokenMetadata>;
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (token.metadata?.blockchainSpecific?.kind !== 'shielded') {
    return null;
  }

  return (
    <View style={styles.shieldedTagWrapper}>
      <CustomTag
        size="S"
        color="secondary"
        backgroundType="semiTransparent"
        icon={
          <Icon
            name="Shield"
            size={15}
            color={theme.brand.white}
            variant="stroke"
          />
        }
        label={t(
          'midnight.tokens-page.token-list-item-customisation.shielded-pill',
        )}
        testID="token-detail-shielded-tag"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shieldedTagWrapper: {
    alignSelf: 'center',
  },
});
