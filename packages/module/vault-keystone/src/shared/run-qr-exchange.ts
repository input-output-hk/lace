import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { firstValueFrom } from 'rxjs';

import type {
  AirGappedQrExchangeOptions,
  AirGappedQrExchangeResult,
} from '@lace-contract/air-gapped-qr-exchange';

/**
 * Runs one air-gapped QR exchange and resolves with the reassembled device
 * response (its UR type and CBOR body). Only drives the transport, leaving
 * request encoding and response parsing to the caller; the Keystone parsers
 * take the full result so they can reject an unexpected UR type themselves.
 *
 * Propagates {@link AirGappedQrExchangeCancelledError} on cancel and errors on
 * a malformed or mismatched response.
 */
export const runAirGappedQrExchange = async (
  options: AirGappedQrExchangeOptions,
): Promise<AirGappedQrExchangeResult> =>
  firstValueFrom(airGappedQrExchangeHook.trigger(options));
