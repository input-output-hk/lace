import { Serializable } from '@lace-lib/util-store';
import { createAction } from '@reduxjs/toolkit';

import type {
  CardanoCustodyBuildError,
  CardanoCustodyBuildRequest,
  CardanoCustodyBuildResult,
} from './build-transaction';
import type {
  CardanoCustodyCreatorIndexProbeError,
  CardanoCustodyCreatorIndexProbeRequest,
  CardanoCustodyCreatorIndexProbeResult,
} from './creator-index-probe';

/**
 * Request, completion and failure of a custody transaction build, which a
 * blockchain module answers. Payloads carry `bigint` and Cardano values, so
 * each travels encoded as `Serializable` (ADR 08) and `requestId` stays
 * plain for correlation without decoding.
 */
export const cardanoCustodyBuildActions = {
  buildCustodyTransaction: createAction(
    'cardanoCustody/buildCustodyTransaction',
    (request: CardanoCustodyBuildRequest) => ({
      payload: {
        requestId: request.requestId,
        request: Serializable.to(request),
      },
    }),
  ),
  buildCustodyTransactionCompleted: createAction(
    'cardanoCustody/buildCustodyTransactionCompleted',
    ({
      requestId,
      result,
    }: {
      requestId: string;
      result: CardanoCustodyBuildResult;
    }) => ({ payload: { requestId, result: Serializable.to(result) } }),
  ),
  buildCustodyTransactionFailed: createAction(
    'cardanoCustody/buildCustodyTransactionFailed',
    ({
      requestId,
      error,
    }: {
      requestId: string;
      error: CardanoCustodyBuildError;
    }) => ({ payload: { requestId, error: Serializable.to(error) } }),
  ),
  /**
   * Request and answer of a creator index probe, which a blockchain module
   * answers from chain reads alone. Every payload is plain JSON.
   */
  probeCustodyCreatorIndex:
    createAction<CardanoCustodyCreatorIndexProbeRequest>(
      'cardanoCustody/probeCustodyCreatorIndex',
    ),
  probeCustodyCreatorIndexCompleted: createAction<{
    requestId: string;
    result: CardanoCustodyCreatorIndexProbeResult;
  }>('cardanoCustody/probeCustodyCreatorIndexCompleted'),
  probeCustodyCreatorIndexFailed: createAction<{
    requestId: string;
    error: CardanoCustodyCreatorIndexProbeError;
  }>('cardanoCustody/probeCustodyCreatorIndexFailed'),
};
