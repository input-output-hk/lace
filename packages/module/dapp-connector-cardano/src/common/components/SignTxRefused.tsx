import type { StyleProp, ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import { Column, Icon, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { SIGN_TX_REFUSED_KEYS } from './sign-tx-refused-keys';

import type { SignTxRefusalDetails } from './sign-tx-refused-keys';

/**
 * The REFUSED state of the dApp sign-tx consent surface.
 *
 * Renders the refusal and the requesting ORIGIN, and nothing derived from the
 * transaction -- no addresses, no amounts, no CBOR: this input is already
 * judged hostile. The origin is required, because a user with several dApps
 * open cannot otherwise tell which site tried.
 *
 * That origin is the one attacker-influenced string here, so it is a plain
 * `Text` child: React never interprets a string child as markup, and no
 * link/URL/HTML component is involved. Mode-agnostic; whichever layout hosts
 * it OMITS its primary button (the `SignTxError` idiom), so the only
 * affordance is dismiss.
 */
export const SignTxRefused = ({
  refusal,
  style,
}: {
  refusal: SignTxRefusalDetails;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Column
      alignItems="center"
      justifyContent="center"
      gap={spacing.L}
      style={style}>
      {/* Decorative only -- already shipping on this surface
          (`AuthorizeDappStatusTag`); the refusal is conveyed in TEXT. */}
      <Icon name="AlertTriangle" size={43} variant="solid" />
      <Text.M align="center" testID="sign-tx-refused-description">
        {t(SIGN_TX_REFUSED_KEYS.description[refusal.case])}
      </Text.M>
      <Text.S align="center">{t(SIGN_TX_REFUSED_KEYS.reassurance)}</Text.S>
      <Text.XS align="center">{t(SIGN_TX_REFUSED_KEYS.originLabel)}</Text.XS>
      <Text.S align="center" testID="sign-tx-refused-origin">
        {refusal.dappOrigin}
      </Text.S>
    </Column>
  );
};
