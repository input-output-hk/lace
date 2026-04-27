import React, { type ReactNode } from 'react';
import { Modal } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../lace-context';

import { PasswordAuthPromptOverlay } from './PasswordAuthPromptOverlay';

import type { PasswordAuthPromptUIHandles } from './types';
import type { AuthSecret } from '@lace-contract/authentication-prompt';

type PasswordAuthPromptContainerProps = {
  children: (handles: PasswordAuthPromptUIHandles) => ReactNode;
  sendPassword: (password: AuthSecret) => Promise<void>;
};

export const PasswordAuthPromptContainer = ({
  children,
  sendPassword,
}: PasswordAuthPromptContainerProps) => {
  const authenticationPromptState = useLaceSelector(
    'authenticationPrompt.selectState',
  );
  const shouldShowBiometricUnlockOffer = useLaceSelector(
    'authenticationPrompt.selectShowBiometricUnlockOffer',
  );
  const onCancel = useDispatchLaceAction(
    'authenticationPrompt.cancelled',
    true,
  );
  const onConfirm = useDispatchLaceAction(
    'authenticationPrompt.confirmedPassword',
  );
  const onSwitchToBiometric = useDispatchLaceAction(
    'authenticationPrompt.switchToBiometric',
  );

  if (authenticationPromptState.status === 'Idle') return null;
  return (
    <Modal
      animationType="fade"
      transparent
      visible
      onRequestClose={() => {
        onCancel();
      }}>
      <PasswordAuthPromptOverlay>
        {children({
          state: authenticationPromptState,
          onCancel,
          onConfirm: async password => {
            await sendPassword(password);
            onConfirm();
          },
          onSwitchToBiometric,
          shouldShowBiometricUnlockOffer,
        })}
      </PasswordAuthPromptOverlay>
    </Modal>
  );
};
