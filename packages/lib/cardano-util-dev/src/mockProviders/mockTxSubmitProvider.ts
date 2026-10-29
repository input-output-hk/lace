import { vi } from 'vitest';

import type { TxSubmitProvider } from '@lace-lib/cardano-core';
import type { Mocked } from 'vitest';

/** Provider stub for testing returns TxSubmitProvider-compatible object */
export const mockTxSubmitProvider = (): Mocked<TxSubmitProvider> => ({
  healthCheck: vi.fn().mockResolvedValue(true),
  submitTx: vi.fn().mockResolvedValue(void 0),
});

export type TxSubmitProviderStub = ReturnType<typeof mockTxSubmitProvider>;
