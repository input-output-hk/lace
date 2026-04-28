import React from 'react';

import {
  PasswordAuthPrompt,
  PasswordAuthPromptContainer,
  BiometricRequiredPrompt,
} from '../components';
import { useLaceSelector, useDispatchLaceAction } from '../lace-context';

import type { AvailableAddons } from '../index';
import type { RenderAuthPromptUI } from '@lace-contract/authentication-prompt';
import type { AuthSecret } from '@lace-contract/authentication-prompt';
import type { ContextualLaceInit } from '@lace-contract/module';

const GeneralAuthenticationPrompt = ({
  sendPassword,
}: {
  sendPassword: (password: AuthSecret) => Promise<void>;
}) => {
  const authState = useLaceSelector('authenticationPrompt.selectState');
  const onGoToSettings = useDispatchLaceAction(
    'authenticationPrompt.goToSettings',
    true,
  );
  const onCancel = useDispatchLaceAction(
    'authenticationPrompt.cancelled',
    true,
  );

  switch (authState.status) {
    case 'BiometricRequired':
      return (
        <BiometricRequiredPrompt
          key={'biometric-required-prompt'}
          visible
          onGoToSettings={onGoToSettings}
          onCancel={onCancel}
        />
      );
    case 'Preparing':
    case 'OpenPassword':
    case 'VerifyingPassword':
    case 'OpenBiometric':
    case 'VerifyingBiometric':
      return (
        <PasswordAuthPromptContainer
          key={'password-authentication-prompt'}
          sendPassword={sendPassword}>
          {handles => <PasswordAuthPrompt {...handles} />}
        </PasswordAuthPromptContainer>
      );
    case 'Completing':
    case 'Idle':
    default:
      return <></>;
  }
};

const loadRenderAuthPromptUI: ContextualLaceInit<
  RenderAuthPromptUI,
  AvailableAddons
> = async ({ loadModules }, dependencies) => {
  const authSecretApiExtension = await loadModules(
    'addons.loadAuthenticationPromptInternalAuthSecretApiExtension',
  );
  const { sendAuthSecretInternally } =
    authSecretApiExtension[0].consumeInternalAuthSecretApi(dependencies);

  return () => (
    <GeneralAuthenticationPrompt sendPassword={sendAuthSecretInternally} />
  );
};

export default loadRenderAuthPromptUI;
