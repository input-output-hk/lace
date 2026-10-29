// A copy of @lace-lib/cardano-input-selection's test helper: that package's
// tests depend on this one, so its helpers cannot be imported here.
import type { Cardano } from '@lace-lib/cardano-core';
import type {
  ChangeAddressResolver,
  Selection,
} from '@lace-lib/cardano-input-selection';

export const mockChangeAddress =
  'addr_test1qqydn46r6mhge0kfpqmt36m6q43knzsd9ga32n96m89px3nuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475qypp3m9' as Cardano.PaymentAddress;

export class MockChangeAddressResolver implements ChangeAddressResolver {
  async resolve(selection: Selection) {
    return selection.change.map(txOut => ({
      ...txOut,
      address: mockChangeAddress,
    }));
  }
}
