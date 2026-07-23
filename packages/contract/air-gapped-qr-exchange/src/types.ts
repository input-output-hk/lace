import type { TranslationKey } from '@lace-contract/i18n';
import type { UrResult } from '@lace-lib/ur-transport';
import type { BlockchainName } from '@lace-lib/util-store';
import type { Observable } from 'rxjs';

/** A reassembled air-gapped device response: its UR type and untagged CBOR body. */
export type AirGappedQrExchangeResult = UrResult;

/**
 * The request the overlay displays as an animated QR. Either prebuilt animated
 * part strings, or a (urType, cbor) payload the overlay encodes to parts via the
 * protocol transport. Exactly one form is provided.
 */
export type AirGappedQrExchangeRequest =
  | {
      /** Ordered animated-QR part strings rendered as the request. */
      frames: string[];
      cbor?: never;
      urType?: never;
    }
  | {
      /** Untagged CBOR body of the request payload. */
      cbor: Uint8Array;
      /** UR type string of the request payload, e.g. 'cardano-sign-request'. */
      urType: string;
      frames?: never;
    };

/** Options describing a single air-gapped QR exchange. */
export interface AirGappedQrExchangeOptions {
  /** The request to display to the device as an animated QR. */
  request: AirGappedQrExchangeRequest;
  /**
   * UR type(s) expected from the device response. A single string accepts one
   * type; an array accepts any of a set (e.g. the Bitcoin import accepts both
   * crypto-hdkey and the crypto-account Sparrow export). Reassembled results
   * whose type is in neither are rejected so the wrong scan cannot fulfil the
   * exchange. See {@link matchesExpectedResponseType}.
   */
  expectedResponseType: string | readonly string[];
  /** Frames advanced per second when animating the request QR. Optional. */
  fps?: number;
  /** i18n key for the overlay title. Falls back to a per-phase default. */
  titleKey?: TranslationKey;
  /** i18n key for the overlay instruction text. Falls back to a per-phase default. */
  instructionKey?: TranslationKey;
  /**
   * i18n key for the instruction shown only while the request QR is displayed,
   * for exchanges whose scan step needs the standard scan copy. Takes
   * precedence over instructionKey in the request phase; the scan phase
   * ignores it. Optional.
   */
  requestInstructionKey?: TranslationKey;
  /**
   * Preformatted detail line rendered under the instruction while the request
   * QR is shown, e.g. a transaction hash the user cross-checks against the
   * device screen. Optional.
   */
  detail?: string;
  /** Blockchain whose icon the request QR shows. Defaults to Cardano. */
  chainType?: BlockchainName;
}

/**
 * Triggers a full air-gapped QR exchange: display the request as an animated QR,
 * then scan the device's animated response. Resolves with the response once,
 * then completes. Cancellation or error terminates the Observable with an error
 * (see {@link AirGappedQrExchangeCancelledError}) so the caller can detect it.
 */
export type AirGappedQrExchange = (
  options: AirGappedQrExchangeOptions,
) => Observable<AirGappedQrExchangeResult>;

/**
 * Whether a reassembled response UR type satisfies the exchange's expected
 * type(s). A single string matches exactly; an array matches any member. Used by
 * both the SW side-effect gate and the view-side overlay gate so a UR whose type
 * is in neither is dropped in both places.
 */
export const matchesExpectedResponseType = (
  expected: string | readonly string[],
  actual: string,
): boolean =>
  typeof expected === 'string'
    ? expected === actual
    : expected.includes(actual);

/** Error the exchange Observable fails with when the user cancels. */
export class AirGappedQrExchangeCancelledError extends Error {
  public constructor() {
    super('Seed signer QR exchange was cancelled');
    this.name = 'AirGappedQrExchangeCancelledError';
  }
}
