import { createStateMachine } from '@lace-lib/util-store';

import type { Config, AuthenticationPromptSliceState } from './types';
import type { EventOf } from '@lace-lib/util-store';

export type AuthenticationPromptEvent = EventOf<typeof stateMachine>;

export const initialState = {
  status: 'Idle',
} as AuthenticationPromptSliceState;

// Helper function to handle cancellation consistently
const handleCancellation = (previousState: AuthenticationPromptSliceState) => {
  // Only allow cancellation if the current state has config and it's cancellable
  if ('config' in previousState && previousState.config.cancellable) {
    return {
      ...previousState,
      status: 'Completing' as const,
      success: false, // Cancellation is treated as unsuccessful authentication
    };
  }
  return previousState;
};

const handlePreempted = (
  previousState: Exclude<AuthenticationPromptSliceState, { status: 'Idle' }>,
) => ({
  ...previousState,
  status: 'Completing' as const,
  success: false,
});

export const stateMachine = createStateMachine(
  'authenticationPrompt',
  initialState,
  {
    Idle: {
      requested: (_, config: Config) => ({
        config,
        status: 'Preparing',
      }),
    },
    Preparing: {
      // Side effect will determine which auth method to use and dispatch appropriate action
      openedPassword: previousState => ({
        ...previousState,
        authSecretError: false,
        status: 'OpenPassword',
      }),
      openedBiometric: previousState => ({
        ...previousState,
        authSecretError: false,
        status: 'OpenBiometric',
      }),
      biometricRequired: previousState => ({
        ...previousState,
        status: 'BiometricRequired',
      }),
      cancelled: handleCancellation,
      preempted: handlePreempted,
    },
    BiometricRequired: {
      goToSettings: previousState => ({
        ...previousState,
        status: 'Completing',
        success: false,
      }),
      cancelled: handleCancellation,
      preempted: handlePreempted,
    },
    OpenPassword: {
      confirmedPassword: previousState => {
        return {
          ...previousState,
          authSecretError: false,
          status: 'VerifyingPassword',
        };
      },
      biometricAutoFilled: previousState => ({
        ...previousState,
        status: 'Completing',
        success: true,
      }),
      switchToBiometric: previousState => ({
        ...previousState,
        authSecretError: false,
        status: 'OpenBiometric',
      }),
      cancelled: handleCancellation,
      preempted: handlePreempted,
    },
    OpenBiometric: {
      confirmedBiometric: previousState => {
        return {
          ...previousState,
          authSecretError: false,
          status: 'VerifyingBiometric',
        };
      },
      cancelled: handleCancellation,
      switchToPassword: previousState => ({
        config: previousState.config,
        authSecretError: false,
        status: 'OpenPassword',
        biometricsUnavailable: true,
      }),

      preempted: handlePreempted,
    },
    VerifyingPassword: {
      verifiedPassword: (previousState, { success }: { success: boolean }) => {
        if (success) {
          return {
            ...previousState,
            status: 'Completing',
            success: true,
          };
        }

        return {
          ...previousState,
          authSecretError: true,
          status: 'OpenPassword',
        };
      },

      cancelled: handleCancellation,
      preempted: handlePreempted,
    },
    VerifyingBiometric: {
      verifiedBiometric: (
        previousState,
        {
          success,
          androidKeystoreRecovery,
        }: {
          success: boolean;
          androidKeystoreRecovery?: {
            attemptNumber: number;
            maxAttempts: number;
          };
        },
      ) => {
        if (success) {
          return {
            ...previousState,
            status: 'Completing',
            success: true,
          };
        }

        return {
          ...previousState,
          authSecretError: true,
          status: 'OpenBiometric',
          androidKeystoreRecovery,
        };
      },
      biometricCanceled: ({ config }) => ({
        status: 'OpenPassword',
        config,
        authSecretError: false,
      }),

      cancelled: handleCancellation,
      preempted: handlePreempted,
    },
    Completing: {
      completed: (_, __: { success: boolean }) => ({
        status: 'Idle',
      }),
      preempted: previousState => previousState,
    },
  },
);
