import type { FailureId } from '../value-objects';

export type ParsedFailureId = {
  blockchain?: string;
  category?: string;
};

const KNOWN_BLOCKCHAINS = new Set(['cardano', 'midnight', 'bitcoin']);

/**
 * Splits a `FailureId` along the convention `{blockchain}-{category}-{rest}`
 * enforced by failure-id value objects. Returns the first two segments when
 * the first segment is a known blockchain; returns an empty object otherwise
 * so analytics omits the fields rather than ship garbage.
 */
export const parseFailureId = (failureId: FailureId): ParsedFailureId => {
  const segments = failureId.split('-');
  if (segments.length < 3) return {};
  const [blockchain, category] = segments;
  if (!KNOWN_BLOCKCHAINS.has(blockchain)) return {};
  const normalized = blockchain.charAt(0).toUpperCase() + blockchain.slice(1);
  return { blockchain: normalized, category };
};
