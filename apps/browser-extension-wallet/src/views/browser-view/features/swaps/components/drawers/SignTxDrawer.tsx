import React from 'react'; // createContext, useCallback, useContext,
import { Button, Flex, PasswordBox } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation } from '@lace/common';
import { useSecrets } from '@lace/core';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import noop from 'lodash/noop';
import { SwapStage } from '../../types';
import { useSwaps } from '../SwapProvider';
import { useTranslation } from 'react-i18next';

export const SignTxDrawer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { stage, setStage, signAndSubmitSwapRequest } = useSwaps();
  const { setPassword, password } = useSecrets();

  return (
    <Drawer
      open={stage === SwapStage.SignTx}
      onClose={() => setStage(SwapStage.Initial)}
      navigation={
        <DrawerNavigation
          title={t('swaps.signDrawer.heading')}
          onArrowIconClick={() => setStage(SwapStage.SwapReview)}
          onCloseIconClick={() => setStage(SwapStage.Initial)}
        />
      }
      dataTestId="swap-sign-drawer"
      footer={
        <Button.CallToAction
          w={'$fill'}
          label={t('dapp.transactions.confirm.title')}
          onClick={async () => {
            await withSignTxConfirmation(signAndSubmitSwapRequest, password.value);
          }}
        />
      }
    >
      <Flex flexDirection="column" justifyContent="center" alignItems="center" w="$fill" h="$fill">
        <PasswordBox
          onSubmit={noop}
          label={t('core.walletNameAndPasswordSetupStep.confirmPasswordInputLabel')}
          onChange={setPassword}
        />
      </Flex>
    </Drawer>
  );
};
