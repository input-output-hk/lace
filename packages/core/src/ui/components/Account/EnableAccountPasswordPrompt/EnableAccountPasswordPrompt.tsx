/* eslint-disable react/no-multi-comp */
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Box, Button, Flex, Text, UncontrolledPasswordBox } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation, useAutoFocus } from '@lace/common';
import styles from './EnableAccountPasswordPrompt.module.scss';
import { useSecrets } from '@src/ui/hooks';

const inputId = `id-${uuidv4()}`;

interface Props {
  open: boolean;
  isPasswordIncorrect: boolean;
  translations: {
    title: string;
    headline: string;
    description: string;
    passwordPlaceholder: string;
    wrongPassword: string;
    cancel: string;
    confirm: string;
  };
  onCancel: () => void;
  onConfirm: () => void;
  isPopup: boolean;
}

const EnableAccountPassword = ({
  isPasswordIncorrect,
  onConfirm,
  translations
}: Pick<Props, 'isPasswordIncorrect' | 'onConfirm' | 'translations'>) => {
  const { setPassword } = useSecrets();

  useAutoFocus(inputId, true);

  return (
    <UncontrolledPasswordBox
      label={translations.passwordPlaceholder}
      data-testid="enable-account-password-input"
      onChange={setPassword}
      onSubmit={(event): void => {
        event.preventDefault();
        onConfirm();
      }}
      errorMessage={isPasswordIncorrect ? translations.wrongPassword : undefined}
      rootStyle={{ width: '100%' }}
      id={inputId}
      autoFocus
    />
  );
};

export const EnableAccountPasswordPrompt = ({
  open,
  isPopup,
  onConfirm,
  onCancel,
  isPasswordIncorrect,
  translations
}: Props): JSX.Element => {
  const { password, clearSecrets } = useSecrets();

  const handleClose = () => {
    clearSecrets();
    // wait for propogation before executing onCancel
    setTimeout(onCancel, 0);
  };
  return (
    <Drawer
      zIndex={1100}
      open={open}
      navigation={<DrawerNavigation title={isPopup ? undefined : translations.title} onArrowIconClick={handleClose} />}
      onClose={handleClose}
      popupView={isPopup}
      footer={
        <Flex flexDirection="column">
          <Box mb="$16" w="$fill">
            <Button.CallToAction
              w="$fill"
              disabled={!password?.value}
              onClick={() => {
                onConfirm();
              }}
              data-testid="enable-account-password-prompt-confirm-btn"
              label={translations.confirm}
            />
          </Box>
          <Button.Secondary
            w="$fill"
            onClick={handleClose}
            data-testid="enable-account-password-prompt-cancel-btn"
            label={translations.cancel}
          />
        </Flex>
      }
    >
      <Flex h="$fill" flexDirection="column" testId="enable-account-password">
        <Text.SubHeading weight="$bold" data-testid="enable-account-headline">
          {translations.headline}
        </Text.SubHeading>
        <Box mt="$8">
          <Text.Body.Normal weight="$medium" className={styles.description} data-testid="enable-account-description">
            {translations.description}
          </Text.Body.Normal>
        </Box>
        <Flex
          w="$fill"
          alignItems="center"
          justifyContent={isPopup ? undefined : 'center'}
          className={isPopup ? styles.passwordPopUpLayout : styles.passwordExtendedLayout}
        >
          {open && (
            <EnableAccountPassword
              isPasswordIncorrect={isPasswordIncorrect}
              onConfirm={onConfirm}
              translations={translations}
            />
          )}
        </Flex>
      </Flex>
    </Drawer>
  );
};
