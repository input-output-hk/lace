import { vi } from 'vitest';

import type {
  DRepInfo,
  GetDRepInfoArgs,
  GetDRepsInfoArgs,
} from '@lace-lib/cardano-core';

export const mockDrepProvider = () => ({
  getDRepInfo: vi
    .fn()
    .mockImplementation(
      ({ id }: GetDRepInfoArgs): Promise<DRepInfo> =>
        Promise.resolve({ active: true, amount: 0n, hasScript: false, id }),
    ),
  getDRepsInfo: vi
    .fn()
    .mockImplementation(
      ({ ids }: GetDRepsInfoArgs): Promise<DRepInfo[]> =>
        Promise.resolve(
          ids.map(id => ({ active: true, amount: 0n, hasScript: false, id })),
        ),
    ),
  healthCheck: vi.fn().mockResolvedValue({ ok: true }),
});

export type MockDrepProvider = ReturnType<typeof mockDrepProvider>;
