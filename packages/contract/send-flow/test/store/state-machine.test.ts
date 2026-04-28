import { TokenId } from '@lace-contract/tokens';
import { makeStateMachineExecutor } from '@lace-lib/util-dev';
import { BigNumber } from '@lace-sdk/util';
import { describe, expect, it, vi } from 'vitest';

import { createFormInitialState } from '../../src/store/form-initial-state';
import { sendFlowMachine } from '../../src/store/state-machine';

import type {
  AmountError,
  FormValidationResult,
  SendFlowSliceState,
} from '../../src/types';
import type { Address } from '@lace-contract/addresses';
import type { TranslationKey } from '@lace-contract/i18n';
import type { Token } from '@lace-contract/tokens';
import type { AccountId, AnyWallet } from '@lace-contract/wallet-repo';

vi.spyOn(console, 'error').mockImplementation((message: string) => {
  throw new Error(message);
});

type StateWithStatusOf<Status extends SendFlowSliceState['status']> =
  SendFlowSliceState & { status: Status };

const testToken: Token = {
  accountId: 'mn-acc' as AccountId,
  address: 'mn-addr' as Address,
  blockchainName: 'Midnight',
  tokenId: TokenId('id'),
  available: BigNumber(100n),
  pending: BigNumber(0n),
  displayLongName: 'Test token',
  displayShortName: 'TT1',
  decimals: 2,
  metadata: {
    name: 'Test token',
    decimals: 2,
    ticker: 'TT1',
    blockchainSpecific: {},
  },
};

const testToken2: Token = {
  accountId: 'cardano-acc' as AccountId,
  address: 'cardano-addr' as Address,
  blockchainName: 'Cardano',
  tokenId: TokenId('id'),
  available: BigNumber(10n),
  pending: BigNumber(0n),
  displayLongName: 'Test token 2',
  displayShortName: 'TT2',
  decimals: 3,
  metadata: {
    name: 'Test token 2',
    decimals: 3,
    ticker: 'TT2',
    blockchainSpecific: {},
  },
};

const tokenA: Token = {
  accountId: 'acc-A' as AccountId,
  address: 'addr-A' as Address,
  blockchainName: 'Midnight',
  tokenId: TokenId('id-1'),
  available: BigNumber(100n),
  pending: BigNumber(0n),
  displayLongName: 'Token A',
  displayShortName: 'TA',
  decimals: 2,
  metadata: {
    name: 'Token A',
    decimals: 2,
    ticker: 'TA',
    blockchainSpecific: {},
  },
};

const txErrorTranslationKeys = {
  subtitle: 'TranslationKey' as TranslationKey,
  title: 'TranslationKey' as TranslationKey,
};

const execute = makeStateMachineExecutor(sendFlowMachine);

const insufficientBalanceError = { error: 'insufficient-balance' as const };

/**
 * Simulates first validation after open on a fresh form.
 * With `dirty: false` on untouched fields, the validator skips them and
 * returns no errors — errors only appear after user interaction.
 */
const initialOpenFormValidationResult: FormValidationResult[] = [
  { fieldName: 'address', error: null },
  {
    fieldName: 'tokenTransfers.amount',
    id: testToken.tokenId,
    error: null,
  },
];

const stateIdle = sendFlowMachine.initialState;

const statePreparing = execute(
  stateIdle,
  sendFlowMachine.events.openRequested({
    accountId: 'mn-acc' as AccountId,
  }),
);

const stateAfterPrepare = execute(
  statePreparing,
  sendFlowMachine.events.preparingCompleted({
    wallet: {} as AnyWallet,
    form: createFormInitialState({ token: testToken }),
    blockchainName: testToken.blockchainName,
    accountId: 'mn-acc' as AccountId,
  }),
);

const stateForm = execute(
  stateAfterPrepare,
  sendFlowMachine.events.formValidationCompleted({
    result: initialOpenFormValidationResult,
  }),
) as StateWithStatusOf<'Form'>;

const stateSelectToken = execute(
  stateForm,
  sendFlowMachine.events.formDataChanged({
    data: {
      fieldName: 'address',
      value: 'address',
    },
  }),
  sendFlowMachine.events.formValidationCompleted({
    result: [
      { fieldName: 'address', error: null },
      {
        fieldName: 'tokenTransfers.amount',
        id: testToken.tokenId,
        // amount still dirty: false → validator skips → null
        error: null,
      },
    ],
  }),
  sendFlowMachine.events.selectToken(),
);

const stateFormCorrect = execute(
  stateForm,
  sendFlowMachine.events.formDataChanged({
    data: {
      fieldName: 'address',
      value: 'address',
    },
  }),
  sendFlowMachine.events.formValidationCompleted({
    result: [
      { fieldName: 'address', error: null },
      {
        fieldName: 'tokenTransfers.amount',
        id: testToken.tokenId,
        // amount still dirty: false here → validator skips → null
        error: null,
      },
    ],
  }),
  sendFlowMachine.events.formDataChanged({
    data: {
      fieldName: 'tokenTransfers.amount',
      id: testToken.tokenId,
      value: BigNumber(1n),
    },
  }),
  sendFlowMachine.events.formValidationCompleted({
    result: [
      { fieldName: 'address', error: null },
      {
        fieldName: 'tokenTransfers.amount',
        id: testToken.tokenId,
        error: null,
      },
    ],
  }),
) as StateWithStatusOf<'FormTxBuilding'>;

const stateFormReady = execute(
  stateFormCorrect,
  sendFlowMachine.events.txBuildResulted({
    result: {
      fees: [{ amount: BigNumber(10n), tokenId: testToken.tokenId }],
      serializedTx: 'serializedTx',
      success: true,
    },
  }),
) as StateWithStatusOf<'Form'>;

const stateSummaryAwaitingConfirmation = execute(
  stateFormReady,
  sendFlowMachine.events.confirmed(),
  sendFlowMachine.events.confirmed(),
);

describe('send-flow stateMachine', () => {
  describe('Idle', () => {
    it('switches to "Preparing" when received "openRequested" event', () => {
      const state = execute(
        stateIdle,
        sendFlowMachine.events.openRequested({
          accountId: 'mn-acc' as AccountId,
        }),
      );

      expect(state).toEqual({
        accountId: 'mn-acc' as AccountId,
        blockchainSpecificData: {},
        initialAddress: undefined,
        initialAmount: undefined,
        initialSelectedToken: undefined,
        status: 'Preparing',
      });
    });

    it('switches to "Preparing" with initial data if defined in the "openRequested" event', () => {
      const state = execute(
        stateIdle,
        sendFlowMachine.events.openRequested({
          accountId: 'mn-acc' as AccountId,
          blockchainSpecificData: {
            myBlockchainSpecific: 'data',
          },
          initialAddress: 'address',
          initialAmount: BigNumber(1n),
          initialSelectedToken: testToken,
        }),
      );

      expect(state).toEqual({
        accountId: 'mn-acc' as AccountId,
        blockchainSpecificData: {
          myBlockchainSpecific: 'data',
        },
        initialSelectedToken: testToken,
        initialAddress: 'address',
        initialAmount: BigNumber(1n),
        status: 'Preparing',
      });
    });
  });

  describe('Preparing', () => {
    describe('on "preparingCompleted" event', () => {
      describe('without initial address or amount', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({ token: testToken }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation" for initial validation', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('disables confirm button', () => {
          expect(state.confirmButtonEnabled).toEqual(false);
        });

        it('sets initial data', () => {
          // eslint-disable-next-line @typescript-eslint/naming-convention,@typescript-eslint/no-unused-vars
          const { status, confirmButtonEnabled, ...rest } = state;
          expect(rest).toMatchInlineSnapshot(`
            {
              "accountId": "mn-acc",
              "blockchainName": "Midnight",
              "blockchainSpecificData": {},
              "fees": [],
              "form": {
                "address": {
                  "dirty": false,
                  "error": null,
                  "value": "",
                },
                "tokenTransfers": [
                  {
                    "amount": {
                      "dirty": false,
                      "error": null,
                      "value": "0",
                    },
                    "token": {
                      "value": {
                        "accountId": "mn-acc",
                        "address": "mn-addr",
                        "available": "100",
                        "blockchainName": "Midnight",
                        "decimals": 2,
                        "displayLongName": "Test token",
                        "displayShortName": "TT1",
                        "metadata": {
                          "blockchainSpecific": {},
                          "decimals": 2,
                          "name": "Test token",
                          "ticker": "TT1",
                        },
                        "pending": "0",
                        "tokenId": "id",
                      },
                    },
                  },
                ],
              },
              "minimumAmount": "-1",
              "serializedTx": "",
              "wallet": {},
            }
          `);
        });
      });

      describe('with both initial address and amount (auto-validation)', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({
              token: testToken,
              address: 'initial-address',
              amount: BigNumber(50n),
            }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation" for auto-validation', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('disables confirm button', () => {
          expect(state.confirmButtonEnabled).toEqual(false);
        });

        it('sets form with initialized address and amount marked as dirty', () => {
          expect(state.form.address.dirty).toEqual(true);
          expect(state.form.address.value).toEqual('initial-address');
          expect(state.form.tokenTransfers[0].amount.dirty).toEqual(true);
          expect(state.form.tokenTransfers[0].amount.value.toString()).toEqual(
            '50',
          );
        });

        it('initializes with empty fees and serializedTx', () => {
          expect(state.fees).toEqual([]);
          expect(state.serializedTx).toEqual('');
        });
      });

      describe('with only initial address', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({
              token: testToken,
              address: 'initial-address',
            }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation"', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('marks address as dirty but leaves amount untouched', () => {
          expect(state.form.address.dirty).toEqual(true);
          expect(state.form.address.value).toEqual('initial-address');
          expect(state.form.tokenTransfers[0].amount.dirty).toEqual(false);
          expect(state.form.tokenTransfers[0].amount.value.toString()).toEqual(
            '0',
          );
        });
      });

      describe('with only initial amount', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({
              token: testToken,
              amount: BigNumber(50n),
            }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation"', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('marks amount as dirty but leaves address untouched', () => {
          expect(state.form.address.dirty).toEqual(false);
          expect(state.form.address.value).toEqual('');
          expect(state.form.tokenTransfers[0].amount.dirty).toEqual(true);
          expect(state.form.tokenTransfers[0].amount.value.toString()).toEqual(
            '50',
          );
        });
      });

      describe('with initial address but empty string', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({
              token: testToken,
              address: '',
              amount: BigNumber(50n),
            }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation"', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('leaves address untouched when the initial value is empty', () => {
          expect(state.form.address.dirty).toEqual(false);
          expect(state.form.address.value).toEqual('');
        });
      });

      describe('with initial amount of zero', () => {
        const state = execute(
          statePreparing,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({
              token: testToken,
              address: 'initial-address',
              amount: BigNumber(0n),
            }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation"', () => {
          expect(state.status).toEqual('FormPendingValidation');
        });

        it('leaves amount untouched when the initial value is zero', () => {
          expect(state.form.tokenTransfers[0].amount.dirty).toEqual(false);
          expect(state.form.tokenTransfers[0].amount.value.toString()).toEqual(
            '0',
          );
        });
      });

      describe('preserves blockchainSpecificData from Preparing state', () => {
        const statePreparingWithData = execute(
          stateIdle,
          sendFlowMachine.events.openRequested({
            accountId: 'mn-acc' as AccountId,
            blockchainSpecificData: { customField: 'customValue' },
          }),
        );

        const state = execute(
          statePreparingWithData,
          sendFlowMachine.events.preparingCompleted({
            wallet: {} as AnyWallet,
            form: createFormInitialState({ token: testToken }),
            blockchainName: testToken.blockchainName,
            accountId: 'mn-acc' as AccountId,
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('preserves blockchainSpecificData', () => {
          expect(state.blockchainSpecificData).toEqual({
            customField: 'customValue',
          });
        });
      });
    });

    describe('on "formDataChanged" event in Preparing state', () => {
      describe('with address change', () => {
        const stateWithInitialAddress = execute(
          stateIdle,
          sendFlowMachine.events.openRequested({
            accountId: 'mn-acc' as AccountId,
            initialAddress: 'original-address',
          }),
        );

        const stateWithUpdatedAddress = execute(
          stateWithInitialAddress,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'address',
              value: 'updated-address',
            },
          }),
        ) as StateWithStatusOf<'Preparing'>;

        it('stays in "Preparing" state', () => {
          expect(stateWithUpdatedAddress.status).toEqual('Preparing');
        });

        it('updates initialAddress for use in preparingCompleted', () => {
          expect(stateWithUpdatedAddress.initialAddress).toEqual(
            'updated-address',
          );
        });

        it('uses updated address when transitioning to FormPendingValidation', () => {
          const formState = execute(
            stateWithUpdatedAddress,
            sendFlowMachine.events.preparingCompleted({
              wallet: {} as AnyWallet,
              form: createFormInitialState({
                token: testToken,
                address: stateWithUpdatedAddress.initialAddress,
              }),
              blockchainName: testToken.blockchainName,
              accountId: 'mn-acc' as AccountId,
            }),
          ) as StateWithStatusOf<'FormPendingValidation'>;

          expect(formState.form.address.value).toEqual('updated-address');
        });
      });

      describe('with amount change', () => {
        const stateWithAmountChange = execute(
          statePreparing,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.amount',
              id: testToken.tokenId,
              value: BigNumber(100n),
            },
          }),
        ) as StateWithStatusOf<'Preparing'>;

        it('stays in "Preparing" state', () => {
          expect(stateWithAmountChange.status).toEqual('Preparing');
        });

        it('ignores amount changes during preparation', () => {
          // Amount changes should not affect Preparing state
          // Verify state remains unchanged
          const preparingState =
            statePreparing as StateWithStatusOf<'Preparing'>;
          expect(stateWithAmountChange.accountId).toEqual(
            preparingState.accountId,
          );
          expect(stateWithAmountChange.blockchainSpecificData).toEqual(
            preparingState.blockchainSpecificData,
          );
        });
      });

      describe('with token selection change', () => {
        const stateWithTokenChange = execute(
          statePreparing,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.addTokens',
              tokens: [tokenA],
            },
          }),
        ) as StateWithStatusOf<'Preparing'>;

        it('stays in "Preparing" state', () => {
          expect(stateWithTokenChange.status).toEqual('Preparing');
        });

        it('ignores token changes during preparation', () => {
          const preparingState =
            statePreparing as StateWithStatusOf<'Preparing'>;
          expect(stateWithTokenChange.accountId).toEqual(
            preparingState.accountId,
          );
        });
      });
    });

    describe('on "closed" event in Preparing state', () => {
      const state = execute(
        statePreparing,
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'Idle'>;

      it('switches to "Idle"', () => {
        expect(state.status).toEqual('Idle');
      });
    });
  });

  describe('Form', () => {
    describe('on "formDataChanged" event', () => {
      it('clears fees and preserves serializedTx on form data change', () => {
        const changeEvent = sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'tokenTransfers.amount',
            id: testToken.tokenId,
            value: BigNumber(9n),
          },
        });

        const stateAfterFormChange = execute(
          stateFormReady,
          changeEvent,
        ) as StateWithStatusOf<'FormPendingValidation'>;

        expect(stateAfterFormChange.fees).toEqual([]);
        // serializedTx is preserved for potential discard
        expect(stateAfterFormChange.serializedTx).toEqual(
          stateFormReady.serializedTx,
        );
        // txBuildErrorTranslationKey is cleared
        expect(stateAfterFormChange.txBuildErrorTranslationKey).toEqual(
          undefined,
        );
      });

      describe('with address or amount', () => {
        const stateWithChangedAddress = execute(
          stateForm,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'address',
              value: 'address',
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        const stateWithChangedAmount = execute(
          stateForm,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.amount',
              id: testToken.tokenId,
              value: BigNumber(1n),
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        it('switches to "FormPendingValidation"', () => {
          expect(stateWithChangedAddress.status).toEqual(
            'FormPendingValidation',
          );
          expect(stateWithChangedAmount.status).toEqual(
            'FormPendingValidation',
          );
        });

        it('updates form data', () => {
          expect(stateWithChangedAddress.form).toMatchInlineSnapshot(`
            {
              "address": {
                "dirty": true,
                "error": null,
                "value": "address",
              },
              "tokenTransfers": [
                {
                  "amount": {
                    "dirty": false,
                    "error": null,
                    "value": "0",
                  },
                  "token": {
                    "value": {
                      "accountId": "mn-acc",
                      "address": "mn-addr",
                      "available": "100",
                      "blockchainName": "Midnight",
                      "decimals": 2,
                      "displayLongName": "Test token",
                      "displayShortName": "TT1",
                      "metadata": {
                        "blockchainSpecific": {},
                        "decimals": 2,
                        "name": "Test token",
                        "ticker": "TT1",
                      },
                      "pending": "0",
                      "tokenId": "id",
                    },
                  },
                },
              ],
            }
          `);

          expect(stateWithChangedAmount.form).toMatchInlineSnapshot(`
            {
              "address": {
                "dirty": false,
                "error": null,
                "value": "",
              },
              "tokenTransfers": [
                {
                  "amount": {
                    "dirty": true,
                    "error": null,
                    "value": "1",
                  },
                  "token": {
                    "value": {
                      "accountId": "mn-acc",
                      "address": "mn-addr",
                      "available": "100",
                      "blockchainName": "Midnight",
                      "decimals": 2,
                      "displayLongName": "Test token",
                      "displayShortName": "TT1",
                      "metadata": {
                        "blockchainSpecific": {},
                        "decimals": 2,
                        "name": "Test token",
                        "ticker": "TT1",
                      },
                      "pending": "0",
                      "tokenId": "id",
                    },
                  },
                },
              ],
            }
          `);
        });

        it('disables confirm button', () => {
          expect(stateWithChangedAddress.confirmButtonEnabled).toEqual(false);
          expect(stateWithChangedAmount.confirmButtonEnabled).toEqual(false);
        });
      });
    });

    describe('on "txPreviewResulted" event with success', () => {
      it('does not re-validate when tx preview reports the same minimumAmount reference', () => {
        const next = execute(
          stateFormReady,
          sendFlowMachine.events.txPreviewResulted({
            result: {
              success: true,
              minimumAmount: stateFormReady.minimumAmount,
            },
          }),
        ) as StateWithStatusOf<'Form'>;

        expect(next.status).toEqual('Form');
        expect(next.fees).toEqual(stateFormReady.fees);
        expect(next.minimumAmount).toEqual(stateFormReady.minimumAmount);
        expect(next.serializedTx).toEqual('serializedTx');
      });

      it('switches to "FormPendingValidation" when minimumAmount changes', () => {
        const next = execute(
          stateFormReady,
          sendFlowMachine.events.txPreviewResulted({
            result: {
              success: true,
              minimumAmount: BigNumber(5n),
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        expect(next.status).toEqual('FormPendingValidation');
        expect(next.minimumAmount).toEqual(BigNumber(5n));
        expect(next.fees).toEqual(stateFormReady.fees);
      });
    });

    describe('on "txBuildResulted" event with failure', () => {
      it('clears fees, disables confirm, keeps serialized tx, and surfaces the error (from FormTxBuilding)', () => {
        const before = stateFormCorrect;
        const next = execute(
          before,
          sendFlowMachine.events.txBuildResulted({
            result: {
              success: false,
              errorTranslationKey:
                'v2.send-flow.form.errors.address.invalid' satisfies TranslationKey,
            },
          }),
        ) as StateWithStatusOf<'Form'>;

        expect(next.fees).toEqual([]);
        expect(next.minimumAmount).toEqual(before.minimumAmount);
        expect(next.serializedTx).toEqual(before.serializedTx);
        expect(next.status).toEqual('Form');
        expect(next.confirmButtonEnabled).toEqual(false);
        expect(next.txBuildErrorTranslationKey).toEqual(
          'v2.send-flow.form.errors.address.invalid',
        );
      });
    });

    describe('on "confirmed" event', () => {
      it('switches to "Summary" if form data is correct and serialized tx is available', () => {
        const state = execute(
          stateFormReady,
          sendFlowMachine.events.confirmed(),
        );
        expect(state.status).toEqual('Summary');
      });

      it('stays in "Form" if form data is not correct', () => {
        const state = execute(stateForm, sendFlowMachine.events.confirmed());
        expect(state.status).toEqual('Form');
      });

      it('stays in "Form" if there is no serialized tx', () => {
        const state = execute(
          stateForm, // stateForm has no serializedTx yet
          sendFlowMachine.events.confirmed(),
        );
        expect(state.status).toEqual('Form');
      });
    });

    describe('on "closed" event when serializedTx is available', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      it('switches to "DiscardingTx"', () => {
        expect(state.status).toEqual('DiscardingTx');
      });

      it('keeps the serializedTx', () => {
        expect(state.serializedTx).toEqual(stateFormReady.serializedTx);
      });
    });

    describe('on "closed" event when there is no serializedTx', () => {
      const state = execute(
        stateForm,
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'Idle'>;

      it('switches to "Idle"', () => {
        expect(state.status).toEqual('Idle');
      });
    });
  });

  describe('SelectToken', () => {
    describe('on "handleTokenChange" event', () => {
      const stateWithAddressAndChangedToken = execute(
        stateSelectToken,
        sendFlowMachine.events.handleTokenChange({
          token: testToken2,
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      it('stays in "FormPendingValidation"', () => {
        expect(stateWithAddressAndChangedToken.status).toEqual(
          'FormPendingValidation',
        );
      });

      it('resets form data but not address field', () => {
        expect(stateWithAddressAndChangedToken.form).toMatchInlineSnapshot(`
          {
            "address": {
              "dirty": true,
              "error": null,
              "value": "address",
            },
            "tokenTransfers": [
              {
                "amount": {
                  "dirty": false,
                  "error": null,
                  "value": "0",
                },
                "token": {
                  "value": {
                    "accountId": "cardano-acc",
                    "address": "cardano-addr",
                    "available": "10",
                    "blockchainName": "Cardano",
                    "decimals": 3,
                    "displayLongName": "Test token 2",
                    "displayShortName": "TT2",
                    "metadata": {
                      "blockchainSpecific": {},
                      "decimals": 3,
                      "name": "Test token 2",
                      "ticker": "TT2",
                    },
                    "pending": "0",
                    "tokenId": "id",
                  },
                },
              },
            ],
          }
        `);
      });

      it('disables confirm button', () => {
        expect(stateWithAddressAndChangedToken.confirmButtonEnabled).toEqual(
          false,
        );
      });
    });
  });

  describe('FormPendingValidation', () => {
    describe('on "formValidationCompleted" event', () => {
      const stateFormNoErrors = execute(
        stateFormReady, // Start from Form state (not FormTxBuilding)
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'tokenTransfers.amount',
            id: testToken.tokenId,
            value: BigNumber(2n),
          },
        }),
        sendFlowMachine.events.formValidationCompleted({
          result: [
            { fieldName: 'address', error: null },
            {
              fieldName: 'tokenTransfers.amount',
              id: testToken.tokenId,
              error: null,
            },
          ],
        }),
      ) as StateWithStatusOf<'FormTxBuilding'>;

      const stateFormWithAddressError = execute(
        stateFormReady, // Start from Form state (not FormTxBuilding)
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'address',
            value: '',
          },
        }),
        sendFlowMachine.events.formValidationCompleted({
          result: [
            {
              fieldName: 'address',
              error: 'error.translation.key' as TranslationKey,
            },
            {
              fieldName: 'tokenTransfers.amount',
              id: testToken.tokenId,
              error: null,
            },
          ],
        }),
      ) as StateWithStatusOf<'Form'>;

      const stateFormWithAmountError = execute(
        stateFormReady, // Start from Form state (not FormTxBuilding)
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'tokenTransfers.amount',
            id: testToken.tokenId,
            value: BigNumber(9999n),
          },
        }),
        sendFlowMachine.events.formValidationCompleted({
          result: [
            { fieldName: 'address', error: null },
            {
              fieldName: 'tokenTransfers.amount',
              id: testToken.tokenId,
              error: insufficientBalanceError,
            },
          ],
        }),
      ) as StateWithStatusOf<'Form'>;

      it('switches to "FormTxBuilding" when valid, "Form" when errors', () => {
        expect(stateFormNoErrors.status).toEqual('FormTxBuilding');
        expect(stateFormWithAddressError.status).toEqual('Form');
        expect(stateFormWithAmountError.status).toEqual('Form');
      });

      it('updates form data with errors when validation fails', () => {
        const extractErrors = (state: StateWithStatusOf<'Form'>) => {
          const result: Record<string, AmountError | string | null> = {};

          result.address = state.form.address.error ?? null;

          state.form.tokenTransfers.forEach((tt, index) => {
            result[`tokenTransfers[${index}].amount`] = tt.amount.error ?? null;
          });

          if (state.form.blockchainSpecific) {
            result.blockchainSpecific =
              state.form.blockchainSpecific.error ?? null;
          }

          return result;
        };
        expect(extractErrors(stateFormWithAddressError)).toMatchInlineSnapshot(`
          {
            "address": "error.translation.key",
            "tokenTransfers[0].amount": null,
          }
        `);
        expect(extractErrors(stateFormWithAmountError)).toMatchInlineSnapshot(`
          {
            "address": null,
            "tokenTransfers[0].amount": {
              "error": "insufficient-balance",
            },
          }
        `);
      });

      it('disables confirm button', () => {
        expect(stateFormNoErrors.confirmButtonEnabled).toEqual(false);
        expect(stateFormWithAddressError.confirmButtonEnabled).toEqual(false);
        expect(stateFormWithAmountError.confirmButtonEnabled).toEqual(false);
      });
    });

    describe('on "closed" event when serializedTx is available', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'address',
            value: '',
          },
        }),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      it('switches to "DiscardingTx"', () => {
        expect(state.status).toEqual('DiscardingTx');
      });

      it('keeps the serializedTx', () => {
        expect(state.serializedTx).toEqual(stateFormReady.serializedTx);
      });
    });

    describe('on "closed" event when there is no serializedTx', () => {
      const state = execute(
        stateForm,
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'address',
            value: '',
          },
        }),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'Idle'>;

      it('switches to "Idle"', () => {
        expect(state.status).toEqual('Idle');
      });
    });

    describe('on "txPreviewResulted" event (stale preview with unchanged minimum)', () => {
      const stateFormPendingValidation = execute(
        stateFormReady,
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'tokenTransfers.amount',
            id: testToken.tokenId,
            value: BigNumber(5n),
          },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      const state = execute(
        stateFormPendingValidation,
        sendFlowMachine.events.txPreviewResulted({
          result: {
            success: true,
            minimumAmount: BigNumber(1n),
          },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      it('stays in FormPendingValidation', () => {
        expect(state.status).toEqual('FormPendingValidation');
      });

      it('preserves form data', () => {
        expect(state.form.tokenTransfers[0].amount.value).toEqual(
          BigNumber(5n),
        );
      });
    });
  });

  describe('FormTxBuilding', () => {
    describe('on "formDataChanged" event', () => {
      const state = execute(
        stateFormCorrect,
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'tokenTransfers.amount',
            id: testToken.tokenId,
            value: BigNumber(33n),
          },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      it('transitions to FormPendingValidation with updated form data', () => {
        expect(state.status).toEqual('FormPendingValidation');
      });

      it('updates the amount in form', () => {
        expect(state.form.tokenTransfers[0].amount.value).toEqual(
          BigNumber(33n),
        );
      });
    });
  });

  describe('Summary', () => {
    describe('on "confirmed" event', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'SummaryAwaitingConfirmation'>;

      it('switches to "SummaryAwaitingConfirmation"', () => {
        expect(state.status).toEqual('SummaryAwaitingConfirmation');
      });

      it('disables confirm button', () => {
        expect(state.confirmButtonEnabled).toEqual(false);
      });
    });

    describe('on "back" event', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.back(),
      ) as StateWithStatusOf<'Form'>;

      it('switches back to "Form"', () => {
        expect(state.status).toEqual('Form');
      });

      it('preserves form data', () => {
        expect(state.form).toEqual(stateFormReady.form);
      });

      it('preserves fees', () => {
        expect(state.fees).toEqual(stateFormReady.fees);
      });
    });

    describe('on "closed" event', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      it('switches to "DiscardingTx"', () => {
        expect(state.status).toEqual('DiscardingTx');
      });

      it('keeps the serializedTx', () => {
        expect(state.serializedTx).toEqual(stateFormReady.serializedTx);
      });
    });
  });

  describe('SummaryAwaitingConfirmation', () => {
    describe('on confirmationCompleted event with success', () => {
      describe('with success', () => {
        const state = execute(
          stateSummaryAwaitingConfirmation,
          sendFlowMachine.events.confirmationCompleted({
            result: {
              serializedTx: 'serializedTx',
              success: true,
            },
          }),
        ) as StateWithStatusOf<'Processing'>;

        it('switches to Processing', () => {
          expect(state.status).toEqual('Processing');
        });

        it('disables confirm button', () => {
          expect(state.confirmButtonEnabled).toEqual(false);
        });
      });

      describe('with failure', () => {
        const state = execute(
          stateSummaryAwaitingConfirmation,
          sendFlowMachine.events.confirmationCompleted({
            result: {
              error: {
                name: 'error name',
              },
              errorTranslationKeys: txErrorTranslationKeys,
              success: false,
            },
          }),
        ) as StateWithStatusOf<'Failure'>;

        it('switches to Failure', () => {
          expect(state.status).toEqual('Failure');
        });

        it('enables confirm button', () => {
          expect(state.confirmButtonEnabled).toEqual(true);
        });

        it('saves error and errorTranslationKeys', () => {
          expect(state.error).toEqual({
            name: 'error name',
          });
          expect(state.errorTranslationKeys).toEqual(txErrorTranslationKeys);
        });
      });
    });
  });

  describe('Processing', () => {
    describe('on "processingResulted" event for success', () => {
      const state = execute(
        stateSummaryAwaitingConfirmation,
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: true,
            txId: 'txId',
          },
        }),
      ) as StateWithStatusOf<'Success'>;

      it('switches to Success', () => {
        expect(state.status).toEqual('Success');
      });

      it('sets the txId', () => {
        expect(state.txId).toEqual('txId');
      });

      it('enables confirm button', () => {
        expect(state.confirmButtonEnabled).toEqual(true);
      });
    });

    describe('on "processingResulted" event for failure', () => {
      const state = execute(
        stateSummaryAwaitingConfirmation,
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: false,
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
      ) as StateWithStatusOf<'Failure'>;

      it('switches to "Failure"', () => {
        expect(state.status).toEqual('Failure');
      });

      it('sets the "txErrorTranslationKeys"', () => {
        expect(state.errorTranslationKeys).toEqual(txErrorTranslationKeys);
      });

      it('enables confirm button', () => {
        expect(state.confirmButtonEnabled).toEqual(true);
      });
    });

    describe('on "closed" event', () => {
      const state = execute(
        stateSummaryAwaitingConfirmation,
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      it('stays in the "Processing" state', () => {
        expect(state.status).toEqual('Processing');
      });

      it('keeps the serializedTx', () => {
        expect(state.serializedTx).toEqual(stateFormReady.serializedTx);
      });
    });
  });

  describe('Success', () => {
    it('switches to "Idle" on "confirmed" event', () => {
      const state = execute(
        stateSummaryAwaitingConfirmation,
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: true,
            txId: 'txId',
          },
        }),
        sendFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'Idle'>;

      expect(state.status).toEqual('Idle');
    });

    it('switches to "Idle" on "closed" event', () => {
      const state = execute(
        stateSummaryAwaitingConfirmation,
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: true,
            txId: 'txId',
          },
        }),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'Idle'>;

      expect(state.status).toEqual('Idle');
    });
  });

  describe('Failure', () => {
    describe('on "confirmed" event', () => {
      const txErrorTranslationKeys = {
        subtitle: 'TranslationKey' as TranslationKey,
        title: 'TranslationKey' as TranslationKey,
      };

      const stateWithFormFilledInAndFailedTransaction = execute(
        stateFormReady,
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: false,
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
        sendFlowMachine.events.confirmed(),
      ) as StateWithStatusOf<'Form'>;

      it('switches to "Form"', () => {
        expect(stateWithFormFilledInAndFailedTransaction.status).toEqual(
          'Form',
        );
      });

      it('preserves form data', () => {
        expect(stateWithFormFilledInAndFailedTransaction.form).toEqual(
          stateFormReady.form,
        );
      });
    });

    describe('on "closed" event', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.confirmed(),
        sendFlowMachine.events.confirmationCompleted({
          result: {
            serializedTx: 'serializedTx',
            success: true,
          },
        }),
        sendFlowMachine.events.processingResulted({
          result: {
            success: false,
            errorTranslationKeys: txErrorTranslationKeys,
          },
        }),
        sendFlowMachine.events.closed(),
      ) as StateWithStatusOf<'DiscardingTx'>;

      it('switches to "DiscardingTx"', () => {
        expect(state.status).toEqual('DiscardingTx');
      });

      it('keeps the serializedTx', () => {
        expect(state.serializedTx).toEqual(stateFormReady.serializedTx);
      });
    });
  });

  describe('DiscardingTx', () => {
    it('switches to "Idle" on "confirmed" event', () => {
      const state = execute(
        stateFormReady,
        sendFlowMachine.events.closed(),
        sendFlowMachine.events.discardingTxCompleted(),
      ) as StateWithStatusOf<'Idle'>;
      expect(state.status).toEqual('Idle');
    });
  });

  describe('add/remove token transfers', () => {
    describe('Form: add via formDataChanged(tokenTransfers.addTokens)', () => {
      it('appends new transfers and goes to FormPendingValidation', () => {
        const afterAdd = execute(
          stateForm,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.addTokens',
              tokens: [tokenA],
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        expect(afterAdd.status).toBe('FormPendingValidation');
        expect(afterAdd.confirmButtonEnabled).toBe(false);

        expect(afterAdd.form.tokenTransfers.length).toBe(2);
        const ids = afterAdd.form.tokenTransfers.map(
          tt => tt.token.value.tokenId,
        );
        expect(ids).toEqual([testToken.tokenId, tokenA.tokenId]);

        const last = afterAdd.form.tokenTransfers[1];
        expect(last.amount.dirty).toBe(false);
        expect(last.amount.error).toBeNull();
        expect(last.amount.value.toString()).toBe(BigNumber(0n).toString());
      });

      it('can add multiple tokens in a single action', () => {
        // Add multiple tokens at once
        const afterAdd = execute(
          stateForm,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.addTokens',
              tokens: [tokenA, testToken2],
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        expect(afterAdd.form.tokenTransfers.length).toBe(3);
        const ids = afterAdd.form.tokenTransfers.map(
          tt => tt.token.value.tokenId,
        );
        expect(ids).toEqual([
          testToken.tokenId,
          tokenA.tokenId,
          testToken2.tokenId,
        ]);
      });
    });

    describe('Form: remove via formDataChanged(tokenTransfers.removeToken)', () => {
      // Build a Form with TWO transfers first using formDataChanged(addTokens)
      const formWithTwoTransfers = (() => {
        const toFPV = execute(
          stateForm,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.addTokens',
              tokens: [tokenA],
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        // validation result for both address and both amounts
        const toForm = execute(
          toFPV,
          sendFlowMachine.events.formValidationCompleted({
            result: [
              { fieldName: 'address', error: null },
              {
                fieldName: 'tokenTransfers.amount',
                id: tokenA.tokenId,
                error: null,
              },
              {
                fieldName: 'tokenTransfers.amount',
                id: testToken.tokenId,
                error: null,
              },
            ],
          }),
        ) as StateWithStatusOf<'Form'>;

        return toForm;
      })();

      it('removes a specific transfer by id and goes to FormPendingValidation', () => {
        const afterRemove = execute(
          formWithTwoTransfers,
          sendFlowMachine.events.formDataChanged({
            data: {
              fieldName: 'tokenTransfers.removeToken',
              id: tokenA.tokenId,
            },
          }),
        ) as StateWithStatusOf<'FormPendingValidation'>;

        expect(afterRemove.status).toBe('FormPendingValidation');
        expect(afterRemove.form.tokenTransfers.length).toBe(1);
        expect(afterRemove.form.tokenTransfers[0].token.value.tokenId).toBe(
          testToken.tokenId,
        );
      });
    });
  });

  describe('FormPendingValidation: blockchainSpecific validation handling', () => {
    it('applies blockchainSpecific error when present', () => {
      const fpv = execute(
        stateForm,
        sendFlowMachine.events.formDataChanged({
          data: {
            fieldName: 'blockchainSpecific',
            value: { networkFeeMode: 'fast' },
          },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      const backToForm = execute(
        fpv,
        sendFlowMachine.events.formValidationCompleted({
          result: [
            { fieldName: 'address', error: null },
            { fieldName: 'blockchainSpecific', error: 'invalid-bc-specific' },
          ],
        }),
      ) as StateWithStatusOf<'Form'>;

      expect(backToForm.status).toBe('Form');
      expect(backToForm.confirmButtonEnabled).toBe(false);
      expect(backToForm.form.blockchainSpecific).toBeTruthy();
      expect(backToForm.form.blockchainSpecific?.error).toBe(
        'invalid-bc-specific',
      );
    });

    it('no-ops when blockchainSpecific error remains the same', () => {
      const fpv2 = execute(
        stateForm,
        sendFlowMachine.events.formDataChanged({
          data: { fieldName: 'blockchainSpecific', value: { mode: 'economy' } },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      const formWithError = execute(
        fpv2,
        sendFlowMachine.events.formValidationCompleted({
          result: [{ fieldName: 'blockchainSpecific', error: 'same-error' }],
        }),
      ) as StateWithStatusOf<'Form'>;

      const fpv3 = execute(
        formWithError,
        sendFlowMachine.events.formDataChanged({
          data: { fieldName: 'blockchainSpecific', value: { mode: 'economy' } },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      const formStillSameError = execute(
        fpv3,
        sendFlowMachine.events.formValidationCompleted({
          result: [{ fieldName: 'blockchainSpecific', error: 'same-error' }],
        }),
      ) as StateWithStatusOf<'Form'>;

      expect(formStillSameError.form.blockchainSpecific?.error).toBe(
        'same-error',
      );
    });

    it('ignores blockchainSpecific result if the field is not present in the form', () => {
      const fpvNoBS = execute(
        stateForm,
        sendFlowMachine.events.formDataChanged({
          data: { fieldName: 'address', value: 'some-address' },
        }),
      ) as StateWithStatusOf<'FormPendingValidation'>;

      const backToFormNoBS = execute(
        fpvNoBS,
        sendFlowMachine.events.formValidationCompleted({
          result: [
            { fieldName: 'address', error: null },
            { fieldName: 'blockchainSpecific', error: 'should-be-ignored' },
          ],
        }),
      ) as StateWithStatusOf<'Form'>;

      expect(backToFormNoBS.form.blockchainSpecific).toBeUndefined();
    });
  });
});
