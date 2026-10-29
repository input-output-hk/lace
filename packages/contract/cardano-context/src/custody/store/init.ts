import { trackCustodyAccountTokens } from './track-custody-account-tokens';

import type { LaceInit, LaceModuleStoreInit } from '@lace-contract/module';

const init: LaceInit<LaceModuleStoreInit> = () => ({
  sideEffects: [trackCustodyAccountTokens],
});

export default init;
