import type React from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../lace-context';

import type { BiometricAuthPromptUIHandles } from './types';

type BiometricAuthPromptContainerProps = {
  children: (handles: BiometricAuthPromptUIHandles) => React.ReactNode;
};

export const BiometricAuthPromptContainer = ({
  children,
}: BiometricAuthPromptContainerProps): React.ReactNode => {
  const authenticationPromptState = useLaceSelector(
    'authenticationPrompt.selectState',
  );
  const onCancel = useDispatchLaceAction(
    'authenticationPrompt.cancelled',
    true,
  );
  const onConfirm = useDispatchLaceAction(
    'authenticationPrompt.confirmedBiometric',
  );
  const triggerPasswordFlow = useDispatchLaceAction(
    'authenticationPrompt.switchToPassword',
    true,
  );

  if (authenticationPromptState.status === 'Idle') return null;

  return children({
    state: authenticationPromptState,
    onCancel,
    onConfirm,
    triggerPasswordFlow,
  });
};
