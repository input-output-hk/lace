import { Cardano, ProviderFailure } from '@cardano-sdk/core';
import { HttpClientError } from '@lace-lib/util-provider';
import { firstValueFrom } from 'rxjs';
import { dummyLogger } from 'ts-log';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BlockfrostTxEvaluationProvider } from '../../../src/blockfrost';

import type { Serialization } from '@cardano-sdk/core';
import type { HttpClient } from '@lace-lib/util-provider';
import type { Logger } from 'ts-log';

// =====================================================================
// Golden fixtures — bodies `POST /utils/txs/evaluate` answers with.
// =====================================================================
// Blockfrost forwards Ogmios' EvaluateTx in the dialect the `version`
// query parameter selects (default 5), so the parser has to survive the
// endpoint switching under it. Each fixture below is one shape it must
// keep reading; a Blockfrost/Ogmios upgrade that breaks one of them is
// meant to break the matching test rather than silently drop every
// caller onto its fallback budget.
// =====================================================================

/** Ogmios v5 (Blockfrost's default): a map keyed `"<purpose>:<index>"`. */
const OGMIOS_V5_EVALUATION = {
  type: 'jsonwsp/response',
  version: '1.0',
  servicename: 'ogmios',
  methodname: 'EvaluateTx',
  result: {
    EvaluationResult: {
      'mint:0': { memory: 508_703, steps: 165_804_772 },
      'spend:1': { memory: 712_334, steps: 232_015_881 },
      'withdrawal:0': { memory: 302_119, steps: 98_444_310 },
    },
  },
  reflection: { id: 'evaluate' },
};

/** Ogmios v6: an array of validator/budget entries, `cpu` in place of `steps`. */
const OGMIOS_V6_EVALUATION = {
  jsonrpc: '2.0',
  method: 'evaluateTransaction',
  result: [
    {
      validator: { purpose: 'mint', index: 0 },
      budget: { memory: 508_703, cpu: 165_804_772 },
    },
    {
      validator: { purpose: 'spend', index: 1 },
      budget: { memory: 712_334, cpu: 232_015_881 },
    },
    {
      validator: { purpose: 'withdraw', index: 0 },
      budget: { memory: 302_119, cpu: 98_444_310 },
    },
  ],
};

/** A script that fails phase-2: HTTP 200, no budgets. */
const OGMIOS_V5_EVALUATION_FAILURE = {
  type: 'jsonwsp/response',
  version: '1.0',
  servicename: 'ogmios',
  methodname: 'EvaluateTx',
  result: {
    EvaluationFailure: {
      ScriptFailures: {
        'spend:0': [
          { validatorFailed: { error: 'An error has occurred:', traces: [] } },
        ],
      },
    },
  },
};

/**
 * A v6 array whose every entry is unreadable — the dialect drift this dual
 * parser exists for, spelled here as an unknown budget field. Distinct from a
 * transaction that carries no redeemers, which answers with an EMPTY array.
 */
const OGMIOS_V6_UNREADABLE_ENTRIES = {
  jsonrpc: '2.0',
  method: 'evaluateTransaction',
  result: [
    {
      validator: { purpose: 'spend', index: 0 },
      budget: { memory: 508_703, picoseconds: 165_804_772 },
    },
  ],
};

/** The same drift in the v5 map: a purpose spelling the parser does not know. */
const OGMIOS_V5_UNREADABLE_ENTRIES = {
  result: {
    EvaluationResult: {
      'unknownPurpose:0': { memory: 508_703, steps: 165_804_772 },
    },
  },
};

/** A malformed request body: HTTP 200 carrying a jsonwsp fault. */
const OGMIOS_V5_FAULT = {
  type: 'jsonwsp/fault',
  version: '1.0',
  servicename: 'ogmios',
  fault: { code: 'client', string: 'Invalid request: unknown method.' },
};

const txCbor = '84a4008182582000'.repeat(4) as Serialization.TxCBOR;

describe('BlockfrostTxEvaluationProvider', () => {
  let provider: BlockfrostTxEvaluationProvider;
  let mockClient: HttpClient;
  let logger: Logger;

  beforeEach(() => {
    mockClient = { request: vi.fn() } as unknown as HttpClient;
    logger = { ...dummyLogger, warn: vi.fn() };
    provider = new BlockfrostTxEvaluationProvider(mockClient, logger);
  });

  const evaluate = async (response: unknown) => {
    vi.mocked(mockClient.request).mockResolvedValue({
      data: response,
      status: 200,
    });
    return firstValueFrom(provider.evaluateTx({ tx: txCbor }));
  };

  it('posts the transaction CBOR as hex under the CBOR content type', async () => {
    await evaluate(OGMIOS_V5_EVALUATION);

    expect(mockClient.request).toHaveBeenCalledWith('utils/txs/evaluate', {
      body: txCbor,
      headers: { 'Content-Type': 'application/cbor' },
      method: 'POST',
    });
  });

  it('maps the Ogmios v5 result map onto per-redeemer budgets', async () => {
    const result = await evaluate(OGMIOS_V5_EVALUATION);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.mint,
        index: 0,
        budget: { memory: 508_703, steps: 165_804_772 },
      },
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 1,
        budget: { memory: 712_334, steps: 232_015_881 },
      },
      {
        purpose: Cardano.RedeemerPurpose.withdrawal,
        index: 0,
        budget: { memory: 302_119, steps: 98_444_310 },
      },
    ]);
  });

  it('maps the Ogmios v6 entry array onto the same budgets', async () => {
    const result = await evaluate(OGMIOS_V6_EVALUATION);

    expect(result.isOk() && result.value).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.mint,
        index: 0,
        budget: { memory: 508_703, steps: 165_804_772 },
      },
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 1,
        budget: { memory: 712_334, steps: 232_015_881 },
      },
      {
        purpose: Cardano.RedeemerPurpose.withdrawal,
        index: 0,
        budget: { memory: 302_119, steps: 98_444_310 },
      },
    ]);
  });

  it('reads an entry array served without the result envelope', async () => {
    const result = await evaluate([
      { validator: 'spend:0', ex_units: { memory: 1000, steps: 2000 } },
    ]);

    expect(result.isOk() && result.value).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 0,
        budget: { memory: 1000, steps: 2000 },
      },
    ]);
  });

  it('reads a script-free transaction as an empty budget list, not a failure', async () => {
    const result = await evaluate({ result: { EvaluationResult: {} } });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toEqual([]);
  });

  it('fails a v6 entry array whose every entry is unreadable', async () => {
    const result = await evaluate(OGMIOS_V6_UNREADABLE_ENTRIES);

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.InvalidResponse,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      // The base provider prepends its own context tag to every log call.
      expect.any(String),
      'evaluateTx: no evaluation in response',
      expect.stringContaining('picoseconds'),
    );
  });

  it('fails a v5 result map whose every entry is unreadable', async () => {
    const result = await evaluate(OGMIOS_V5_UNREADABLE_ENTRIES);

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.InvalidResponse,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      'evaluateTx: no evaluation in response',
      expect.stringContaining('unknownPurpose'),
    );
  });

  it('keeps the readable budgets when only some entries are unreadable', async () => {
    const result = await evaluate({
      result: [
        { validator: 'spend:0', budget: { memory: 1000, cpu: 2000 } },
        { validator: 'spend:1', budget: { memory: 1000, picoseconds: 2000 } },
      ],
    });

    expect(result.isOk() && result.value).toEqual([
      {
        purpose: Cardano.RedeemerPurpose.spend,
        index: 0,
        budget: { memory: 1000, steps: 2000 },
      },
    ]);
  });

  it('fails an EvaluationFailure rather than reporting no redeemers', async () => {
    const result = await evaluate(OGMIOS_V5_EVALUATION_FAILURE);

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.InvalidResponse,
    );
    expect(!result.isOk() && result.error.detail).toContain('ScriptFailures');
  });

  it('fails a jsonwsp fault served with HTTP 200', async () => {
    const result = await evaluate(OGMIOS_V5_FAULT);

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.InvalidResponse,
    );
  });

  it('fails an unrecognised response shape', async () => {
    const result = await evaluate({ unexpected: true });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.InvalidResponse,
    );
  });

  it('surfaces an HTTP error as the matching provider failure', async () => {
    vi.mocked(mockClient.request).mockRejectedValue(
      new HttpClientError(400, 'Backend did not understand your request.'),
    );

    const result = await firstValueFrom(provider.evaluateTx({ tx: txCbor }));

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(
      ProviderFailure.BadRequest,
    );
  });

  it('surfaces a transport failure (no response) as an unknown provider failure', async () => {
    vi.mocked(mockClient.request).mockRejectedValue(
      new HttpClientError(undefined, undefined, new Error('network down')),
    );

    const result = await firstValueFrom(provider.evaluateTx({ tx: txCbor }));

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && result.error.reason).toBe(ProviderFailure.Unknown);
  });
});
