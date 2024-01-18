/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';

export const getTxCollateral = async (
  tx: Wallet.Cardano.Tx,
  inputResolver: Wallet.Cardano.InputResolver,
  addresses: Wallet.Cardano.PaymentAddress[]
): Promise<Wallet.Cardano.Lovelace> => {
  if (!tx.body.collaterals || tx.body.collaterals.length === 0) return BigInt(0);

  // If total collateral is specified, it means that not all the balance in the collateral inputs would be spent given a validation failure
  if (tx.body.totalCollateral) return BigInt(tx.body.totalCollateral);

  const resolveCollateralInputsRequest = tx.body.collaterals.map((collateral) =>
    inputResolver.resolveInput(collateral)
  );

  const resolvedCollateralInputs = (await Promise.all(resolveCollateralInputsRequest)).filter(Boolean);

  const totalCollateral = Wallet.BigIntMath.sum(resolvedCollateralInputs.map(({ value }) => value.coins));

  if (totalCollateral === BigInt(0)) {
    return BigInt(0);
  }

  if (tx.body.collateralReturn && addresses.includes(tx.body.collateralReturn.address)) {
    return totalCollateral - tx.body.collateralReturn.value.coins;
  }

  return totalCollateral;
};
