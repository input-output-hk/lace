import type * as ledger from '@midnight-ntwrk/ledger-v8';
import type {
  CombinedSwapInputs,
  CombinedSwapOutputs,
  FinalizedTransactionRecipe,
  UnboundTransactionRecipe,
  UnprovenTransactionRecipe,
  WalletFacade,
} from '@midnightntwrk/wallet-sdk/facade';

type Facade = Pick<WalletFacade, 'dust' | 'shielded' | 'unshielded'>;
type SecretKeys = Parameters<WalletFacade['balanceFinalizedTransaction']>[1];
type BalanceOptions = Parameters<
  WalletFacade['balanceFinalizedTransaction']
>[2];
type SwapOptions = Parameters<WalletFacade['initSwap']>[3];
type TransferOutputs = Parameters<WalletFacade['transferTransaction']>[0];
type TransferOptions = Parameters<WalletFacade['transferTransaction']>[2];
type AnyTransaction = Parameters<
  WalletFacade['unshielded']['revertTransaction']
>[0];
type Reserve = <T extends AnyTransaction>(
  transaction: T | undefined,
  holder: Pick<Facade['shielded'] | Facade['unshielded'], 'revertTransaction'>,
) => T | undefined;

/** The inputs a swap offers and the outputs it asks for. */
type MidnightSwap = {
  desiredInputs: CombinedSwapInputs;
  desiredOutputs: CombinedSwapOutputs[];
};

const NO_BALANCING_TRANSACTION =
  'No balancing transaction was created. Please check your transaction.';

const releasingOnFailure = async <T>(
  build: (reserve: Reserve) => Promise<T>,
): Promise<T> => {
  const releases: Array<() => Promise<void>> = [];
  const reserve: Reserve = (transaction, holder) => {
    if (transaction)
      releases.push(async () => holder.revertTransaction(transaction));
    return transaction;
  };
  try {
    return await build(reserve);
  } catch (error) {
    // The build's error is the result; a release that fails leaves its coins
    // reserved until a sync reset, as the wallet SDK's own reverts do.
    await Promise.allSettled(releases.map(async release => release()));
    throw error;
  }
};

const merge = (
  first: ledger.UnprovenTransaction | undefined,
  second: ledger.UnprovenTransaction | undefined,
) => (first && second ? first.merge(second) : first ?? second);

const kindsToBalance = (
  tokenKindsToBalance: BalanceOptions['tokenKindsToBalance'] = 'all',
) => {
  const kinds =
    tokenKindsToBalance === 'all'
      ? ['shielded', 'unshielded', 'dust']
      : tokenKindsToBalance;
  return {
    dust: kinds.includes('dust'),
    shielded: kinds.includes('shielded'),
    unshielded: kinds.includes('unshielded'),
  };
};

/**
 * The wallet SDK's multi-step builds over `facade`, releasing the coins the
 * completed steps reserved when a later step fails. The wallet SDK keeps
 * them, and its caller gets an error with no recipe to release. Each build
 * takes the same steps over the same sub-wallets as its `WalletFacade`
 * namesake and returns the same recipe.
 */
export const withReservationRelease = (facade: Facade) => ({
  balanceFinalizedTransaction: async (
    transaction: ledger.FinalizedTransaction,
    { shieldedSecretKeys, dustSecretKey }: SecretKeys,
    { ttl, tokenKindsToBalance }: BalanceOptions,
  ): Promise<FinalizedTransactionRecipe> =>
    releasingOnFailure(async reserve => {
      const balance = kindsToBalance(tokenKindsToBalance);
      const unshieldedBalancing = balance.unshielded
        ? reserve(
            await facade.unshielded.balanceFinalizedTransaction(transaction),
            facade.unshielded,
          )
        : undefined;
      const shieldedBalancing = balance.shielded
        ? reserve(
            await facade.shielded.balanceTransaction(
              shieldedSecretKeys,
              transaction,
            ),
            facade.shielded,
          )
        : undefined;
      const tokenBalancing = merge(shieldedBalancing, unshieldedBalancing);
      const feeBalancing = balance.dust
        ? await facade.dust.balanceTransactions(
            dustSecretKey,
            tokenBalancing ? [transaction, tokenBalancing] : [transaction],
            ttl,
          )
        : undefined;
      const balancingTransaction = merge(tokenBalancing, feeBalancing);
      if (!balancingTransaction) throw new Error(NO_BALANCING_TRANSACTION);
      return {
        type: 'FINALIZED_TRANSACTION',
        originalTransaction: transaction,
        balancingTransaction,
      };
    }),

  balanceUnboundTransaction: async (
    transaction: UnboundTransactionRecipe['baseTransaction'],
    { shieldedSecretKeys, dustSecretKey }: SecretKeys,
    { ttl, tokenKindsToBalance }: BalanceOptions,
  ): Promise<UnboundTransactionRecipe> =>
    releasingOnFailure(async reserve => {
      const balance = kindsToBalance(tokenKindsToBalance);
      const shieldedBalancing = balance.shielded
        ? reserve(
            await facade.shielded.balanceTransaction(
              shieldedSecretKeys,
              transaction,
            ),
            facade.shielded,
          )
        : undefined;
      // Unshielded balancing adds inputs to the transaction itself without
      // reserving them, so it leaves nothing of its own to release.
      const balancedUnshielded = balance.unshielded
        ? await facade.unshielded.balanceUnboundTransaction(transaction)
        : undefined;
      const baseTransaction = balancedUnshielded ?? transaction;
      const feeBalancing = balance.dust
        ? await facade.dust.balanceTransactions(
            dustSecretKey,
            shieldedBalancing
              ? [baseTransaction, shieldedBalancing]
              : [baseTransaction],
            ttl,
          )
        : undefined;
      const balancingTransaction = merge(shieldedBalancing, feeBalancing);
      if (!balancingTransaction && !balancedUnshielded)
        throw new Error(NO_BALANCING_TRANSACTION);
      return {
        type: 'UNBOUND_TRANSACTION',
        baseTransaction,
        balancingTransaction: balancingTransaction ?? undefined,
      };
    }),

  transferTransaction: async (
    outputs: TransferOutputs,
    { shieldedSecretKeys, dustSecretKey }: SecretKeys,
    { ttl, payFees = true }: TransferOptions,
  ): Promise<UnprovenTransactionRecipe> =>
    releasingOnFailure(async reserve => {
      const shieldedOutputs = outputs.flatMap(output =>
        output.type === 'shielded' ? output.outputs : [],
      );
      const unshieldedOutputs = outputs.flatMap(output =>
        output.type === 'unshielded' ? output.outputs : [],
      );
      if (unshieldedOutputs.length === 0 && shieldedOutputs.length === 0)
        throw new Error(
          'At least one shielded or unshielded output is required.',
        );
      const shieldedTransfer =
        shieldedOutputs.length > 0
          ? reserve(
              await facade.shielded.transferTransaction(
                shieldedSecretKeys,
                shieldedOutputs,
              ),
              facade.shielded,
            )
          : undefined;
      const unshieldedTransfer =
        unshieldedOutputs.length > 0
          ? reserve(
              await facade.unshielded.transferTransaction(
                unshieldedOutputs,
                ttl,
              ),
              facade.unshielded,
            )
          : undefined;
      const transfer = merge(shieldedTransfer, unshieldedTransfer);
      if (!transfer) throw new Error('Unexpected transaction state.');
      const feeBalancing = payFees
        ? await facade.dust.balanceTransactions(dustSecretKey, [transfer], ttl)
        : undefined;
      return {
        type: 'UNPROVEN_TRANSACTION',
        transaction: merge(transfer, feeBalancing) ?? transfer,
      };
    }),

  initSwap: async (
    { desiredInputs, desiredOutputs }: MidnightSwap,
    { shieldedSecretKeys, dustSecretKey }: SecretKeys,
    { ttl, payFees = false }: SwapOptions,
  ): Promise<UnprovenTransactionRecipe> =>
    releasingOnFailure(async reserve => {
      const { shielded: shieldedInputs, unshielded: unshieldedInputs } =
        desiredInputs;
      const shieldedOutputs = desiredOutputs.flatMap(output =>
        output.type === 'shielded' ? output.outputs : [],
      );
      const unshieldedOutputs = desiredOutputs.flatMap(output =>
        output.type === 'unshielded' ? output.outputs : [],
      );
      const hasShieldedPart =
        (!!shieldedInputs && Object.keys(shieldedInputs).length > 0) ||
        shieldedOutputs.length > 0;
      const hasUnshieldedPart =
        (!!unshieldedInputs && Object.keys(unshieldedInputs).length > 0) ||
        unshieldedOutputs.length > 0;
      if (!hasShieldedPart && !hasUnshieldedPart)
        throw new Error(
          'At least one shielded or unshielded swap is required.',
        );
      const shieldedSwap =
        hasShieldedPart && shieldedInputs !== undefined
          ? reserve(
              await facade.shielded.initSwap(
                shieldedSecretKeys,
                shieldedInputs,
                shieldedOutputs,
              ),
              facade.shielded,
            )
          : undefined;
      const unshieldedSwap =
        hasUnshieldedPart && unshieldedInputs !== undefined
          ? reserve(
              await facade.unshielded.initSwap(
                unshieldedInputs,
                unshieldedOutputs,
                ttl,
              ),
              facade.unshielded,
            )
          : undefined;
      const swap = merge(shieldedSwap, unshieldedSwap);
      if (!swap) throw new Error('Unexpected transaction state.');
      const feeBalancing = payFees
        ? await facade.dust.balanceTransactions(dustSecretKey, [swap], ttl)
        : undefined;
      return {
        type: 'UNPROVEN_TRANSACTION',
        transaction: merge(swap, feeBalancing) ?? swap,
      };
    }),
});
