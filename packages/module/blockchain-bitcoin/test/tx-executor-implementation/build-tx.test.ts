import { BigNumber } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { DUST_THRESHOLD } from '../../src/common';
import { makePreviewTx } from '../../src/tx-executor-implementation/build-tx';

import type { SideEffectDependencies } from '@lace-contract/module';

describe('makePreviewTx', () => {
  it('returns the Bitcoin dust threshold as minimumAmount', async () => {
    const previewTx = makePreviewTx({} as SideEffectDependencies);

    const result = await firstValueFrom(
      previewTx({} as Parameters<typeof previewTx>[0]),
    );

    expect(result).toEqual({
      minimumAmount: BigNumber(BigInt(DUST_THRESHOLD)),
      success: true,
    });
  });
});
