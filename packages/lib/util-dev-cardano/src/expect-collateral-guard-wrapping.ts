import {
  CollateralOwnershipError,
  createInputResolver,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom } from 'rxjs';
import { expect } from 'vitest';

import {
  CASE_B_TX,
  OWN_COLLATERAL_UTXO,
  WALLET_ADDRESS,
} from './collateral-guard-fixture';

import type { Cardano } from '@cardano-sdk/core';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { CardanoTransactionSigner } from '@lace-contract/cardano-context';

/**
 * The ownership authority under which {@link CASE_B_TX} is a case-(b)
 * transaction: its collateral input resolves to a wallet address, its
 * collateral return does not. Local-only resolution -- the wallet holds
 * {@link OWN_COLLATERAL_UTXO}.
 */
export const CASE_B_OWNERSHIP: {
  knownAddresses: GroupedAddress[];
  collateralInputResolver: Cardano.InputResolver;
} = {
  knownAddresses: [{ address: WALLET_ADDRESS } as GroupedAddress],
  collateralInputResolver: createInputResolver([OWN_COLLATERAL_UTXO]),
};

/**
 * Asserts a Cardano signer factory wraps its signer in the
 * collateral-ownership guard, by its only observable consequence: a case-(b)
 * transaction is refused, and the signer the factory wraps is never reached.
 *
 * `createSigner` receives the ownership authority to build the signing context
 * from -- each factory has its own context shape. `assertNotDelegated` is what
 * "never reached" means for that factory (an inner-prototype spy, a transport
 * mock), and is what stops the test passing on a signer that merely errors.
 */
export const expectCollateralGuardRefusesCaseB = async ({
  createSigner,
  assertNotDelegated,
}: {
  createSigner: (
    ownership: typeof CASE_B_OWNERSHIP,
  ) => CardanoTransactionSigner;
  assertNotDelegated: () => void;
}): Promise<void> => {
  const signer = createSigner(CASE_B_OWNERSHIP);

  await expect(
    firstValueFrom(signer.sign({ serializedTx: HexBytes(CASE_B_TX) })),
  ).rejects.toBeInstanceOf(CollateralOwnershipError);
  assertNotDelegated();
};
