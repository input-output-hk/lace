import type { ReactNode } from 'react';

import { AuthPromptUI } from '@lace-contract/authentication-prompt';
import React from 'react';

import { AuthenticationPromptOverlay } from '../components';
import { useLaceSelector } from '../lace-context';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const AuthenticationPrompt = () => {
  const isOpen = useLaceSelector('authenticationPrompt.isOpen');

  if (!isOpen) return null;
  return (
    <AuthenticationPromptOverlay>
      <AuthPromptUI />
    </AuthenticationPromptOverlay>
  );
};

const loadGlobalOverlays: ContextualLaceInit<
  ReactNode,
  AvailableAddons
> = async () => <AuthenticationPrompt key={'password-auth-prompt-overlay'} />;

export default loadGlobalOverlays;
