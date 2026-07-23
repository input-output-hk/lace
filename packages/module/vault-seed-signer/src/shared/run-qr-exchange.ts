import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { firstValueFrom } from 'rxjs';

import type {
  AirGappedQrExchangeOptions,
  AirGappedQrExchangeResult,
} from '@lace-contract/air-gapped-qr-exchange';

/**
 * Runs one air-gapped QR exchange and resolves with the reassembled device
 * response (its UR type and CBOR body). Blockchain-agnostic: it only drives the
 * transport, leaving request encoding and response parsing to the per-blockchain
 * caller. Returns the full result rather than only the CBOR so callers that
 * accept more than one response type (the Bitcoin import takes both crypto-hdkey
 * and crypto-account) can dispatch their decode on the reassembled urType; the
 * single Cardano caller just reads .cbor.
 *
 * Propagates {@link AirGappedQrExchangeCancelledError} on cancel and errors on
 * a malformed or mismatched response.
 */
export const runAirGappedQrExchange = async (
  options: AirGappedQrExchangeOptions,
): Promise<AirGappedQrExchangeResult> =>
  firstValueFrom(airGappedQrExchangeHook.trigger(options));
