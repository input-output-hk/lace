import React from 'react';
import { Box, Button, Flex, Loader, Text } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation } from '@lace/common';
import { ReactComponent as HardwareWalletIcon } from '../../../assets/images/hardware-wallet.svg';
import { ReactComponent as ExclamationCircle } from '../../../assets/icons/exclamation-circle.svg';
import styles from './EnableAccountConfirmWithHW.module.scss';

export type EnableAccountConfirmWithHWState = 'waiting' | 'signing' | 'error';

interface Props {
  open: boolean;
  state: EnableAccountConfirmWithHWState;
  onCancel: () => void;
  onRetry: () => void;
  isPopup: boolean;
  translations: {
    title: string;
    headline: string;
    description: string;
    errorHeadline: string;
    errorDescription: string;
    errorHelpLink: string;
    buttons: {
      cancel: string;
      waiting: string;
      signing: string;
      error: string;
    };
  };
}

export const EnableAccountConfirmWithHW = ({
  open,
  state,
  isPopup,
  onRetry,
  onCancel,
  translations
}: Props): JSX.Element => (
  <Drawer
    zIndex={1100}
    open={open}
    navigation={<DrawerNavigation title={translations.title} onCloseIconClick={onCancel} />}
    onClose={onCancel}
    popupView={isPopup}
    footer={
      <Flex flexDirection="column">
        <Box mb="$16" w="$fill">
          <Button.CallToAction
            w="$fill"
            disabled={state !== 'error'}
            onClick={onRetry}
            data-testid="enable-account-hw-signing-confirm-btn"
            label={translations.buttons[state]}
            icon={state !== 'error' && <Loader w="$24" h="$24" />}
          />
        </Box>
        <Button.Secondary
          w="$fill"
          onClick={onCancel}
          data-testid="enable-account-hw-signing-cancel-btn"
          label={translations.buttons.cancel}
        />
      </Flex>
    }
  >
    <Flex
      className={styles.text}
      h="$fill"
      data-testid="enable-account-hw-signing"
      flexDirection="column"
      justifyContent="center"
      gap="$12"
    >
      <Flex w="$fill" justifyContent="center" alignItems="center" flexDirection="column" gap="$12">
        {state !== 'error' ? (
          <HardwareWalletIcon style={{ width: 112, height: 112 }} />
        ) : (
          <ExclamationCircle style={{ width: 112, height: 112 }} />
        )}
        <Text.SubHeading weight="$bold">
          {state !== 'error' ? translations.headline : translations.errorHeadline}
        </Text.SubHeading>
        <Text.Body.Normal>
          {state !== 'error' ? (
            translations.description
          ) : (
            <>
              {translations.errorDescription}&nbsp;
              <a href="https://iohk.zendesk.com/hc/en-us" target="_blank">
                {translations.errorHelpLink}
              </a>
            </>
          )}
        </Text.Body.Normal>
      </Flex>
    </Flex>
  </Drawer>
);
