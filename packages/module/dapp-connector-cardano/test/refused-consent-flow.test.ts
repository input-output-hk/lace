import { CollateralOwnershipError } from '@lace-contract/cardano-context';
import { describe, expect, it } from 'vitest';

import { TxSignErrorCode } from '../src/common/api-error';
import { COLLATERAL_BLOCK_LOG } from '../src/common/store/dependencies/cardano-dapp-connector-api';

import {
  CASE_A_TX_CBOR,
  CASE_B_MESSAGE,
  CASE_B_TX_CBOR,
  blockStages,
  createCollateralApi as createApi,
  ORIGIN,
  senderContext as mockSenderContext,
  warnMessages,
} from './support/collateral-api-fixture';

import type { CardanoConfirmationResult } from '../src/common/store/dependencies/create-confirmation-callback';

/**
 * The CONSENT-FLOW half of the refused state: on a block verdict `signTx`
 * OPENS the surface in the refused state AND rejects the dApp at once,
 * without awaiting the consent channel.
 *
 * Two properties this file makes unfalsifiable: the rejection is
 * UNCONDITIONAL -- identical for every consent outcome, so no
 * `if (outcome !== 'confirmed') throw` can hide here -- and IMMEDIATE, so a
 * consent
 * promise that never settles still yields it (an implementation that awaited
 * the round-trip hangs this test rather than failing an assertion).
 */

describe('the refused consent-flow round trip', () => {
  it('case (b) OPENS the consent surface in the refused state carrying the verdict, and rejects with the unchanged CIP-30 contract', async () => {
    const collateralRefusal = 'foreign-collateral-return' as const;
    const { api, userConfirmationRequest, signTransaction } = createApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      // Byte-equal to the pre-existing `CollateralOwnershipError` message,
      // asserted BOTH against the literal above and against the class, so
      // the refused screen's new i18n copy can never quietly replace it.
      info: CASE_B_MESSAGE,
    });
    expect(new CollateralOwnershipError(collateralRefusal).message).toBe(
      CASE_B_MESSAGE,
    );

    // The surface was asked for, in the refused state, before the rejection
    // was raised.
    expect(userConfirmationRequest).toHaveBeenCalledTimes(1);
    expect(userConfirmationRequest).toHaveBeenCalledWith(
      mockSenderContext.sender,
      'signTx',
      { txHex: CASE_B_TX_CBOR, partialSign: true, collateralRefusal },
    );
    expect(signTransaction).not.toHaveBeenCalled();
  });

  it('still rejects identically after a DISMISSAL, and the dismissal resolves nothing', async () => {
    const { api, signTransaction } = createApi({}, async () => ({
      outcome: 'rejected',
    }));

    await expect(
      api.signTx(CASE_B_TX_CBOR, false, mockSenderContext),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.ProofGeneration,
      info: CASE_B_MESSAGE,
    });
    // NOT `UserDeclined` (code 2): that is the signature of a refusal routed
    // through the ordinary `outcome !== 'confirmed'` branch, i.e. of the
    // forbidden
    // shape. The dApp-facing contract is the guard's, unchanged.
    expect(signTransaction).not.toHaveBeenCalled();
  });
});

describe('the rejection is immediate and unconditional', () => {
  const consentOutcomes = [
    {
      label: 'confirmed',
      confirmation: async () => ({ outcome: 'confirmed' as const }),
    },
    {
      label: 'dismissed',
      confirmation: async () => ({ outcome: 'rejected' as const }),
    },
    {
      label: 'disconnected',
      confirmation: async () => ({ outcome: 'disconnected' as const }),
    },
    {
      label: 'unavailable',
      confirmation: async () => ({ outcome: 'unavailable' as const }),
    },
    {
      label: 'consent channel rejected',
      confirmation: async () => {
        throw new Error('surface unavailable');
      },
    },
    {
      label: 'never answered (promise never settles)',
      confirmation: async () =>
        new Promise<CardanoConfirmationResult>(() => {}),
    },
  ];

  it.each(consentOutcomes)(
    'case (b) rejects with the SAME error when the consent outcome is: $label -- and never signs',
    async ({ confirmation }) => {
      const { api, signTransaction } = createApi({}, confirmation);

      await expect(
        api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
      ).rejects.toMatchObject({
        name: 'TxSignError',
        code: TxSignErrorCode.ProofGeneration,
        info: CASE_B_MESSAGE,
      });
      expect(signTransaction).not.toHaveBeenCalled();
    },
  );

  it('rejects while the consent channel is still pending -- the surface is opened, then NOT awaited', async () => {
    let settleConsent:
      | ((result: CardanoConfirmationResult) => void)
      | undefined;
    const { api, userConfirmationRequest, signTransaction } = createApi(
      {},
      async () =>
        new Promise<CardanoConfirmationResult>(resolve => {
          settleConsent = resolve;
        }),
    );

    await expect(
      api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });

    // The surface WAS requested, and its answer had not arrived when the
    // dApp was already rejected.
    expect(userConfirmationRequest).toHaveBeenCalledTimes(1);
    expect(settleConsent).toBeDefined();

    // A late confirm cannot resurrect the request: there is nothing left
    // listening, and no second call happens.
    settleConsent?.({ outcome: 'confirmed' });
    await Promise.resolve();
    expect(signTransaction).not.toHaveBeenCalled();
    expect(userConfirmationRequest).toHaveBeenCalledTimes(1);
  });

  it('does not repeat the rejection or the disclosure when the dApp retries: each call opens the surface exactly once and rejects once', async () => {
    const { api, userConfirmationRequest, signTransaction } = createApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });
    await expect(
      api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });

    expect(userConfirmationRequest).toHaveBeenCalledTimes(2);
    expect(signTransaction).not.toHaveBeenCalled();
  });
});

describe('the refusal survives a broken consent channel', () => {
  it.each([
    {
      label: 'the consent channel throws synchronously',
      confirmation: () => {
        throw new Error('no consent surface available');
      },
    },
    {
      label: 'the consent channel returns a rejected promise',
      confirmation: async () => {
        throw new Error('render failure');
      },
    },
    {
      label: 'the consent channel never settles',
      confirmation: async () =>
        new Promise<CardanoConfirmationResult>(() => {}),
    },
  ])(
    'the request is STILL rejected identically when $label',
    async ({ confirmation }) => {
      const { api, signTransaction } = createApi(
        {},
        confirmation as () => Promise<CardanoConfirmationResult>,
      );

      await expect(
        api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
      ).rejects.toMatchObject({
        name: 'TxSignError',
        code: TxSignErrorCode.ProofGeneration,
        info: CASE_B_MESSAGE,
      });
      expect(signTransaction).not.toHaveBeenCalled();
    },
  );
});

describe('the allow path is untouched', () => {
  it('a normal (case a) tx still reaches the ordinary consent request -- with NO refusal field -- and still signs', async () => {
    const { api, userConfirmationRequest, signTransaction } = createApi();

    await expect(
      api.signTx(CASE_A_TX_CBOR, true, mockSenderContext),
    ).resolves.toBe('witness-set-cbor');

    // Byte-identical to the payload from before the guard existed: the allow
    // path gained no field (`integration-allow-paths.test.ts` pins this too).
    expect(userConfirmationRequest).toHaveBeenCalledWith(
      mockSenderContext.sender,
      'signTx',
      { txHex: CASE_A_TX_CBOR, partialSign: true },
    );
    expect(
      Object.keys(userConfirmationRequest.mock.calls[0][2] as object),
    ).toEqual(['txHex', 'partialSign']);
    expect(signTransaction).toHaveBeenCalledWith(CASE_A_TX_CBOR, true, ORIGIN);
  });

  it('a normal tx the user DECLINES still rejects with UserDeclined (code 2), not with the guard error', async () => {
    const { api, signTransaction } = createApi({}, async () => ({
      outcome: 'rejected',
    }));

    await expect(
      api.signTx(CASE_A_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({
      name: 'TxSignError',
      code: TxSignErrorCode.UserDeclined,
      info: 'User rejected transaction',
    });
    expect(signTransaction).not.toHaveBeenCalled();
  });
});

describe('the block path is observable', () => {
  it('a block logs at WARN with the origin and the case -- the refusal is not silent', async () => {
    const { api, logger } = createApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });

    expect(blockStages(logger)).toContain('refused');
    const blockCall = logger.warn.mock.calls.find(
      call => call[0] === COLLATERAL_BLOCK_LOG,
    );
    expect(blockCall?.[1]).toMatchObject({
      stage: 'refused',
      origin: ORIGIN,
      case: 'foreign-collateral-return',
      partialSign: true,
    });
  });

  it('the DISCLOSURE-REQUESTED branch is logged distinctly from the block itself', async () => {
    const { api, logger } = createApi();

    await expect(
      api.signTx(CASE_B_TX_CBOR, false, mockSenderContext),
    ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });

    expect(blockStages(logger)).toEqual(['refused', 'disclosure-requested']);
    // One greppable anchor, so a responder finds every stage with one search.
    expect(new Set(warnMessages(logger)).size).toBe(1);
  });

  it.each([
    {
      label: 'the consent channel throws synchronously',
      confirmation: () => {
        throw new Error('no consent surface available');
      },
    },
    {
      label: 'the consent channel returns a rejected promise',
      confirmation: async () => {
        throw new Error('render failure');
      },
    },
  ])(
    'the DISCLOSURE-FAILED branch is logged distinctly when $label -- "refused but could not tell them" is visible',
    async ({ confirmation }) => {
      const { api, logger } = createApi(
        {},
        confirmation as () => Promise<CardanoConfirmationResult>,
      );

      await expect(
        api.signTx(CASE_B_TX_CBOR, true, mockSenderContext),
      ).rejects.toMatchObject({ code: TxSignErrorCode.ProofGeneration });
      // The async rejection is reported on a later microtask.
      await Promise.resolve();
      await Promise.resolve();

      expect(blockStages(logger)).toContain('refused');
      expect(blockStages(logger)).toContain('disclosure-failed');
      const failed = logger.warn.mock.calls.find(
        call => (call[1] as { stage?: string })?.stage === 'disclosure-failed',
      );
      expect(failed?.[1]).toMatchObject({
        origin: ORIGIN,
        case: 'foreign-collateral-return',
      });
    },
  );

  it('the ALLOW path logs no collateral-block warning at all', async () => {
    const { api, logger } = createApi();

    await expect(
      api.signTx(CASE_A_TX_CBOR, true, mockSenderContext),
    ).resolves.toBe('witness-set-cbor');

    expect(blockStages(logger)).toEqual([]);
  });
});
