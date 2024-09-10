import React, { useState } from 'react';
import { Box, Button, Flex, PasswordBox, Text } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation } from '@lace/common';
import styles from './EnableAccountPasswordPrompt.module.scss';

interface Props {
  open: boolean;
  wasPasswordIncorrect: boolean;
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
  onConfirm: (passphrase: Uint8Array) => void;
  isPopup: boolean;
}

export const EnableAccountPasswordPrompt = ({
  open,
  wasPasswordIncorrect,
  isPopup,
  onConfirm,
  onCancel,
  translations
}: Props): JSX.Element => {
  const [currentPassword, setCurrentPassword] = useState('');

  return (
    <Drawer
      zIndex={1100}
      open={open}
      navigation={<DrawerNavigation title={isPopup ? undefined : translations.title} onArrowIconClick={onCancel} />}
      onClose={() => {
        onCancel();
        setCurrentPassword('');
      }}
      popupView={isPopup}
      footer={
        <Flex flexDirection="column">
          <Box mb="$16" w="$fill">
            <Button.CallToAction
              w="$fill"
              disabled={currentPassword.trim() === ''}
              onClick={() => onConfirm(Buffer.from(currentPassword))}
              data-testid="enable-account-password-prompt-confirm-btn"
              label={translations.confirm}
            />
          </Box>
          <Button.Secondary
            w="$fill"
            onClick={onCancel}
            data-testid="enable-account-password-prompt-cancel-btn"
            label={translations.cancel}
          />
        </Flex>
      }
    >
      <Flex h="$fill" flexDirection="column" data-testid="enable-account-password">
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
          <PasswordBox
            value={currentPassword}
            label={translations.passwordPlaceholder}
            data-testid="enable-account-password-input"
            onChange={(e) => setCurrentPassword(e.target.value)}
            onSubmit={(event): void => {
              event.preventDefault();
              onConfirm(Buffer.from(currentPassword));
            }}
            errorMessage={wasPasswordIncorrect ? translations.wrongPassword : undefined}
            rootStyle={{ width: '100%' }}
          />
        </Flex>
      </Flex>
    </Drawer>
  );
};
