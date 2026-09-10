import { FailureId } from '@lace-contract/failures';

import type { Ceremony } from '@lace-contract/vault';

/**
 * Mount-failure identifier for a wallet ceremony. Follows the failures
 * `{first}-{second}-{rest}` shape, but `vault` is not a known blockchain, so
 * the failures→analytics forwarder omits the blockchain/category segmentation
 * (a wallet ceremony is not blockchain-specific — the ceremony name carries
 * the signal).
 */
export const vaultCeremonyFailureId = (ceremony: Ceremony): FailureId =>
  FailureId(`vault-ceremony-${ceremony}`);
