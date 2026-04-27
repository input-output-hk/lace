import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { describe, expect, it } from 'vitest';

import { stateMachine } from '../../src/store/state-machine';

import type { AuthenticationPromptSliceState, Config } from '../../src';
import type { TranslationKey } from '@lace-contract/i18n';

const executeEvents = makeStateMachineExecutor(stateMachine);

const config: Config = {
  purpose: 'action-authorization',
  confirmButtonLabel: '' as TranslationKey,
  message: '' as TranslationKey,
};

const stateIdle: AuthenticationPromptSliceState = {
  status: 'Idle',
};

const stateOpenCancellable = executeEvents(
  executeEvents(
    stateIdle,
    stateMachine.events.requested({
      ...config,
      cancellable: true,
    }),
  ),
  stateMachine.events.openedPassword(),
);

const stateVerifyingCancellable = executeEvents(
  stateOpenCancellable,
  stateMachine.events.confirmedPassword(),
);

const stateCompletingCancellableByConfirm = executeEvents(
  stateVerifyingCancellable,
  stateMachine.events.verifiedPassword({
    success: true,
  }),
);

const stateCompletingCancellableByCancel = executeEvents(
  stateOpenCancellable,
  stateMachine.events.cancelled(),
);

const stateOpenNonCancellable = executeEvents(
  executeEvents(
    stateIdle,
    stateMachine.events.requested({
      ...config,
      cancellable: false,
    }),
  ),
  stateMachine.events.openedPassword(),
);

const stateVerifyingNonCancellable = executeEvents(
  stateOpenNonCancellable,
  stateMachine.events.confirmedPassword(),
);

const stateCompletingNonCancellableByConfirm = executeEvents(
  stateVerifyingNonCancellable,
  stateMachine.events.verifiedPassword({
    success: true,
  }),
);

// Biometric flow states
const stateOpenBiometricCancellable = executeEvents(
  executeEvents(
    stateIdle,
    stateMachine.events.requested({
      ...config,
      cancellable: true,
    }),
  ),
  stateMachine.events.openedBiometric(),
);

const stateVerifyingBiometricCancellable = executeEvents(
  stateOpenBiometricCancellable,
  stateMachine.events.confirmedBiometric(),
);

const stateCompletingBiometricCancellableByConfirm = executeEvents(
  stateVerifyingBiometricCancellable,
  stateMachine.events.verifiedBiometric({
    success: true,
  }),
);

const stateCompletingBiometricCancellableByCancel = executeEvents(
  stateOpenBiometricCancellable,
  stateMachine.events.cancelled(),
);

const stateOpenBiometricNonCancellable = executeEvents(
  executeEvents(
    stateIdle,
    stateMachine.events.requested({
      ...config,
      cancellable: false,
    }),
  ),
  stateMachine.events.openedBiometric(),
);

const stateVerifyingBiometricNonCancellable = executeEvents(
  stateOpenBiometricNonCancellable,
  stateMachine.events.confirmedBiometric(),
);

const stateCompletingBiometricNonCancellableByConfirm = executeEvents(
  stateVerifyingBiometricNonCancellable,
  stateMachine.events.verifiedBiometric({
    success: true,
  }),
);

describe('Authentication prompt state machine', () => {
  describe('cancellable', () => {
    it('opens', () => {
      expect(
        executeEvents(
          executeEvents(
            stateIdle,
            stateMachine.events.requested({
              ...config,
              cancellable: true,
            }),
          ),
          stateMachine.events.openedPassword(),
        ),
      ).toMatchInlineSnapshot(`
        {
          "authSecretError": false,
          "config": {
            "cancellable": true,
            "confirmButtonLabel": "",
            "message": "",
            "purpose": "action-authorization",
          },
          "status": "OpenPassword",
        }
      `);
    });

    describe('cancel flow', () => {
      it('allows to cancel the prompt', () => {
        expect(
          executeEvents(stateOpenCancellable, stateMachine.events.cancelled()),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": false,
            "config": {
              "cancellable": true,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "Completing",
            "success": false,
          }
        `);
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingCancellableByCancel,
            stateMachine.events.completed({ success: false }),
          ),
        ).toEqual(stateIdle);
      });
    });

    describe('confirm flow', () => {
      it('accepts entered auth secret', () => {
        expect(
          executeEvents(
            stateOpenCancellable,
            stateMachine.events.confirmedPassword(),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": false,
            "config": {
              "cancellable": true,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "VerifyingPassword",
          }
        `);
      });

      it('accepts successful verification result and starts closing', () => {
        expect(
          executeEvents(
            stateVerifyingCancellable,
            stateMachine.events.verifiedPassword({ success: true }),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": false,
            "config": {
              "cancellable": true,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "Completing",
            "success": true,
          }
        `);
      });

      it('verifies the entered auth secret with error', () => {
        expect(
          executeEvents(
            stateVerifyingCancellable,
            stateMachine.events.verifiedPassword({ success: false }),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": true,
            "config": {
              "cancellable": true,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "OpenPassword",
          }
        `);
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingCancellableByConfirm,
            stateMachine.events.completed({
              success: true,
            }),
          ),
        ).toEqual(stateIdle);
      });
    });
  });

  describe('non-cancellable', () => {
    it('opens', () => {
      expect(
        executeEvents(
          executeEvents(
            stateIdle,
            stateMachine.events.requested({
              ...config,
              cancellable: false,
            }),
          ),
          stateMachine.events.openedPassword(),
        ),
      ).toMatchInlineSnapshot(`
        {
          "authSecretError": false,
          "config": {
            "cancellable": false,
            "confirmButtonLabel": "",
            "message": "",
            "purpose": "action-authorization",
          },
          "status": "OpenPassword",
        }
      `);
    });

    describe('cancel flow', () => {
      it('disallows to cancel the prompt', () => {
        expect(
          executeEvents(
            stateOpenNonCancellable,
            stateMachine.events.cancelled(),
          ),
        ).toEqual(stateOpenNonCancellable);
      });
    });

    describe('confirm flow', () => {
      it('accepts entered auth secret and triggers the verification', () => {
        expect(
          executeEvents(
            stateOpenNonCancellable,
            stateMachine.events.confirmedPassword(),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": false,
            "config": {
              "cancellable": false,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "VerifyingPassword",
          }
        `);
      });

      it('verifies the entered auth secret successfully', () => {
        expect(
          executeEvents(
            stateVerifyingNonCancellable,
            stateMachine.events.verifiedPassword({ success: true }),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": false,
            "config": {
              "cancellable": false,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "Completing",
            "success": true,
          }
        `);
      });

      it('accepts failed verification result and switches back to Open', () => {
        expect(
          executeEvents(
            stateVerifyingNonCancellable,
            stateMachine.events.verifiedPassword({ success: false }),
          ),
        ).toMatchInlineSnapshot(`
          {
            "authSecretError": true,
            "config": {
              "cancellable": false,
              "confirmButtonLabel": "",
              "message": "",
              "purpose": "action-authorization",
            },
            "status": "OpenPassword",
          }
        `);
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingNonCancellableByConfirm,
            stateMachine.events.completed({
              success: true,
            }),
          ),
        ).toEqual(stateIdle);
      });
    });
  });

  describe('Authentication with biometric and cancellable', () => {
    it('opens biometric prompt', () => {
      expect(
        executeEvents(
          executeEvents(
            stateIdle,
            stateMachine.events.requested({
              ...config,
              cancellable: true,
            }),
          ),
          stateMachine.events.openedBiometric(),
        ),
      ).toEqual({
        authSecretError: false,
        config: {
          ...config,
          cancellable: true,
        },
        status: 'OpenBiometric',
      });
    });

    describe('cancel flow', () => {
      it('allows to cancel the biometric prompt', () => {
        expect(
          executeEvents(
            stateOpenBiometricCancellable,
            stateMachine.events.cancelled(),
          ),
        ).toEqual({
          authSecretError: false,
          config: {
            ...config,
            cancellable: true,
          },
          status: 'Completing',
          success: false,
        });
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingBiometricCancellableByCancel,
            stateMachine.events.completed({ success: false }),
          ),
        ).toEqual(stateIdle);
      });
    });

    describe('confirm flow', () => {
      it('accepts biometric confirmation', () => {
        expect(
          executeEvents(
            stateOpenBiometricCancellable,
            stateMachine.events.confirmedBiometric(),
          ),
        ).toEqual({
          authSecretError: false,
          config: {
            ...config,
            cancellable: true,
          },
          status: 'VerifyingBiometric',
        });
      });

      it('accepts successful biometric verification result and starts closing', () => {
        expect(
          executeEvents(
            stateVerifyingBiometricCancellable,
            stateMachine.events.verifiedBiometric({ success: true }),
          ),
        ).toEqual({
          authSecretError: false,
          config: {
            ...config,
            cancellable: true,
          },
          status: 'Completing',
          success: true,
        });
      });

      it('verifies the biometric with error', () => {
        expect(
          executeEvents(
            stateVerifyingBiometricCancellable,
            stateMachine.events.verifiedBiometric({ success: false }),
          ),
        ).toEqual({
          authSecretError: true,
          config: {
            ...config,
            cancellable: true,
          },
          status: 'OpenBiometric',
        });
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingBiometricCancellableByConfirm,
            stateMachine.events.completed({
              success: true,
            }),
          ),
        ).toEqual(stateIdle);
      });
    });
  });

  describe('Authentication with biometric and non-cancellable', () => {
    it('opens biometric prompt', () => {
      expect(
        executeEvents(
          executeEvents(
            stateIdle,
            stateMachine.events.requested({
              ...config,
              cancellable: false,
            }),
          ),
          stateMachine.events.openedBiometric(),
        ),
      ).toEqual({
        authSecretError: false,
        config: {
          ...config,
          cancellable: false,
        },
        status: 'OpenBiometric',
      });
    });

    describe('cancel flow', () => {
      it('disallows to cancel the biometric prompt', () => {
        expect(
          executeEvents(
            stateOpenBiometricNonCancellable,
            stateMachine.events.cancelled(),
          ),
        ).toEqual(stateOpenBiometricNonCancellable);
      });
    });

    describe('confirm flow', () => {
      it('accepts biometric confirmation and triggers the verification', () => {
        expect(
          executeEvents(
            stateOpenBiometricNonCancellable,
            stateMachine.events.confirmedBiometric(),
          ),
        ).toEqual({
          authSecretError: false,
          config: {
            ...config,
            cancellable: false,
          },
          status: 'VerifyingBiometric',
        });
      });

      it('verifies the biometric successfully', () => {
        expect(
          executeEvents(
            stateVerifyingBiometricNonCancellable,
            stateMachine.events.verifiedBiometric({ success: true }),
          ),
        ).toEqual({
          authSecretError: false,
          config: {
            ...config,
            cancellable: false,
          },
          status: 'Completing',
          success: true,
        });
      });

      it('accepts failed biometric verification result and switches back to Open', () => {
        expect(
          executeEvents(
            stateVerifyingBiometricNonCancellable,
            stateMachine.events.verifiedBiometric({ success: false }),
          ),
        ).toEqual({
          authSecretError: true,
          config: {
            ...config,
            cancellable: false,
          },
          status: 'OpenBiometric',
        });
      });

      it('closes the prompt and goes back to the initial state', () => {
        expect(
          executeEvents(
            stateCompletingBiometricNonCancellableByConfirm,
            stateMachine.events.completed({
              success: true,
            }),
          ),
        ).toEqual(stateIdle);
      });
    });
  });

  describe('preempted', () => {
    const statePreparing = executeEvents(
      stateIdle,
      stateMachine.events.requested(config),
    );

    const stateOpenPassword = executeEvents(
      statePreparing,
      stateMachine.events.openedPassword(),
    );

    const stateOpenBiometric = executeEvents(
      statePreparing,
      stateMachine.events.openedBiometric(),
    );

    const stateVerifyingPassword = executeEvents(
      stateOpenPassword,
      stateMachine.events.confirmedPassword(),
    );

    const stateVerifyingBiometric = executeEvents(
      stateOpenBiometric,
      stateMachine.events.confirmedBiometric(),
    );

    const stateBiometricRequired = executeEvents(
      statePreparing,
      stateMachine.events.biometricRequired(),
    );

    const expectedCompletingFailure = {
      config,
      status: 'Completing',
      success: false,
    };

    it('drives Preparing to Completing with success=false', () => {
      expect(
        executeEvents(statePreparing, stateMachine.events.preempted()),
      ).toEqual(expectedCompletingFailure);
    });

    it('drives OpenPassword to Completing with success=false', () => {
      expect(
        executeEvents(stateOpenPassword, stateMachine.events.preempted()),
      ).toEqual({ ...expectedCompletingFailure, authSecretError: false });
    });

    it('drives OpenBiometric to Completing with success=false', () => {
      expect(
        executeEvents(stateOpenBiometric, stateMachine.events.preempted()),
      ).toEqual({ ...expectedCompletingFailure, authSecretError: false });
    });

    it('drives VerifyingPassword to Completing with success=false', () => {
      expect(
        executeEvents(stateVerifyingPassword, stateMachine.events.preempted()),
      ).toEqual({ ...expectedCompletingFailure, authSecretError: false });
    });

    it('drives VerifyingBiometric to Completing with success=false', () => {
      expect(
        executeEvents(stateVerifyingBiometric, stateMachine.events.preempted()),
      ).toEqual({ ...expectedCompletingFailure, authSecretError: false });
    });

    it('drives BiometricRequired to Completing with success=false', () => {
      expect(
        executeEvents(stateBiometricRequired, stateMachine.events.preempted()),
      ).toEqual(expectedCompletingFailure);
    });
  });
});
