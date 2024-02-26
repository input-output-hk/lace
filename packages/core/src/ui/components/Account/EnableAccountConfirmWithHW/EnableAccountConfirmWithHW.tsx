import React from 'react';
import { Box, Button, Flex, Text } from '@lace/ui';
import { Drawer, DrawerNavigation } from '@lace/common';
import { ReactComponent as LacePortal } from '../../../assets/images/lace-portal-01.svg';

export enum EnableAccountConfirmWithHWState {
  ReadyToConfirm = 'ReadyToConfirm',
  Signing = 'Signing'
}

interface Props {
  open: boolean;
  state: EnableAccountConfirmWithHWState;
  onCancel: () => void;
  onConfirm: () => void;
  isPopup: boolean;
  translations: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
    signing: string;
  };
}

export const EnableAccountConfirmWithHW = ({
  open,
  state,
  isPopup,
  onConfirm,
  onCancel,
  translations
}: Props): JSX.Element => (
  <Drawer
    zIndex={1100}
    open={open}
    navigation={<DrawerNavigation onArrowIconClick={onCancel} />}
    onClose={onCancel}
    popupView={isPopup}
    footer={
      <Flex flexDirection="column">
        <Box mb="$16" w="$fill">
          <Button.CallToAction
            w="$fill"
            disabled={state !== EnableAccountConfirmWithHWState.ReadyToConfirm}
            onClick={onConfirm}
            data-testid="enable-account-hw-signing-confirm-btn"
            label={
              state === EnableAccountConfirmWithHWState.ReadyToConfirm ? translations.confirm : translations.signing
            }
          />
        </Box>
        <Button.Secondary
          w="$fill"
          onClick={onCancel}
          data-testid="enable-account-hw-signing-cancel-btn"
          label={translations.cancel}
        />
      </Flex>
    }
  >
    <Flex h="$fill" data-testid="enable-account-hw-signing" flexDirection="column" justifyContent="center">
      <Text.SubHeading weight="$bold">{translations.title}</Text.SubHeading>
      <Text.Body.Normal>{translations.description}</Text.Body.Normal>
      <Flex w="$fill" h="$fill" justifyContent="center" alignItems="center">
        <LacePortal style={{ width: 452, height: 254 }} />
      </Flex>
    </Flex>
  </Drawer>
);
