// The selector's behaviour under the real selection constraints. It lives
// here, with the constraints, because the selector package's tests cannot
// depend on this package.
import { roundRobinRandomImprove } from '@lace-lib/cardano-input-selection';
import { TxTestUtil } from '@lace-lib/cardano-util-dev';

import { defaultSelectionConstraints } from '../../src/input-selection/selectionConstraints';
import { MockChangeAddressResolver } from '../util/changeAddressResolver';
import {
  babbageSelectionParameters,
  cborUtxoSetWithManyAssets,
  getCoreUtxosFromCbor,
  txBuilder,
  txEvaluator,
} from '../util/vectors';

describe('RoundRobinRandomImprove with defaultSelectionConstraints', () => {
  it('splits change outputs if they violate the tokenBundleSizeExceedsLimit constraint', async () => {
    const utxoSet = getCoreUtxosFromCbor(cborUtxoSetWithManyAssets);
    const maxSpendableAmount = 87_458_893n;
    const assetsInUtxoSet = 511;

    const constraints = defaultSelectionConstraints({
      buildTx: txBuilder,
      protocolParameters: babbageSelectionParameters,
      redeemersByType: {},
      txEvaluator: txEvaluator as never,
    });

    const results = await roundRobinRandomImprove({
      changeAddressResolver: new MockChangeAddressResolver(),
    }).select({
      constraints,
      outputs: new Set([
        TxTestUtil.createOutput({ coins: maxSpendableAmount }),
      ]),
      preSelectedUtxo: new Set(),
      utxo: utxoSet,
    });

    expect(results.selection.inputs.size).toBe(utxoSet.size);
    expect(results.selection.change.length).toBe(2);
    expect(
      results.selection.change[0].value.assets!.size +
        results.selection.change[1].value.assets!.size,
    ).toBe(assetsInUtxoSet);
  });
});
