import type { PendingAirGappedQrExchange } from './store';
import type { TranslationKey } from '@lace-contract/i18n';

/** The two sequential phases of an air-gapped exchange. */
export type AirGappedQrExchangePhase = 'request' | 'scan';

const DEFAULT_TITLE_KEY: Record<AirGappedQrExchangePhase, TranslationKey> = {
  request: 'v2.air-gapped-qr-exchange.request.title',
  scan: 'v2.air-gapped-qr-exchange.scan.title',
};

const DEFAULT_INSTRUCTION_KEY: Record<
  AirGappedQrExchangePhase,
  TranslationKey
> = {
  request: 'v2.air-gapped-qr-exchange.request.instruction',
  scan: 'v2.air-gapped-qr-exchange.scan.instruction',
};

/** The i18n keys the overlay renders for the title and instruction. */
export interface AirGappedQrExchangeLabelKeys {
  titleKey: TranslationKey;
  instructionKey: TranslationKey;
}

/**
 * Resolves the overlay's title and instruction i18n keys: the pending exchange's
 * keys take precedence, otherwise a per-phase default is used. In the request
 * phase requestInstructionKey wins over instructionKey; the scan phase ignores
 * it, so a request-only instruction never leaks into the scan step.
 */
export const resolveExchangeLabelKeys = (
  pending: Pick<
    PendingAirGappedQrExchange,
    'instructionKey' | 'requestInstructionKey' | 'titleKey'
  >,
  phase: AirGappedQrExchangePhase,
): AirGappedQrExchangeLabelKeys => ({
  titleKey: pending.titleKey ?? DEFAULT_TITLE_KEY[phase],
  instructionKey:
    (phase === 'request' ? pending.requestInstructionKey : undefined) ??
    pending.instructionKey ??
    DEFAULT_INSTRUCTION_KEY[phase],
});
