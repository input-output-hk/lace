import {
  isCardanoAddress,
  COLLATERAL_AMOUNT_LOVELACES,
  LOVELACE_TOKEN_ID,
} from '@lace-contract/cardano-context';
import { makeBuildTx } from '@lace-contract/tx-executor';
import { firstStateOfStatus } from '@lace-lib/util-store';
import { BigNumber } from '@lace-sdk/util';
import { of, switchMap, withLatestFrom } from 'rxjs';

import type { CollateralFlowSideEffectParams } from './types';
import type { Token } from '@lace-contract/tokens';
import type { TokenTransfer } from '@lace-contract/tx-executor';

/**
 * When collateral flow enters Building state, build the collateral transaction.
 * Emits buildCompleted (→ Ready or Failure): with a failure result when wallet,
 * account or address is missing; or insufficientBalance (→ NotEnoughBalance) when ADA token is missing.
 */
export const buildingSideEffect = (
  actionObservables: CollateralFlowSideEffectParams[0],
  stateObservables: CollateralFlowSideEffectParams[1],
  dependencies: CollateralFlowSideEffectParams[2],
) => {
  const txExecutor = actionObservables.txExecutor;
  const buildTx = makeBuildTx(txExecutor);

  const {
    collateralFlow: { selectState$ },
    wallets: { selectAll$ },
    addresses: { selectAllAddresses$ },
    tokens: { selectTokensGroupedByAccount$ },
  } = stateObservables;
  const { actions, logger } = dependencies;

  return firstStateOfStatus(selectState$, 'Building').pipe(
    withLatestFrom(
      selectAll$,
      selectAllAddresses$,
      selectTokensGroupedByAccount$,
    ),
    switchMap(([state, wallets, allAddresses, tokensGroupedByAccount]) => {
      const accountTokens: Token[] = (() => {
        const group = tokensGroupedByAccount[state.accountId];
        return group ? [...group.fungible, ...group.nfts] : [];
      })();
      const wallet = wallets.find(w =>
        w.accounts.some(a => a.accountId === state.accountId),
      );
      const account = wallet?.accounts.find(
        a => a.accountId === state.accountId,
      );

      if (!wallet || !account) {
        logger.error('Wallet or account not found for collateral flow');
        return of(
          actions.collateralFlow.buildCompleted({
            result: {
              success: false,
              errorTranslationKey: 'collateral.sheet.failure.title',
            },
          }),
        );
      }

      const accountAddresses = allAddresses.filter(
        (addr): addr is typeof addr & { blockchainName: 'Cardano' } =>
          isCardanoAddress(addr) && addr.accountId === state.accountId,
      );
      const firstAddress = accountAddresses[0];

      if (!firstAddress) {
        logger.error('No Cardano addresses found for account');
        return of(
          actions.collateralFlow.buildCompleted({
            result: {
              success: false,
              errorTranslationKey: 'collateral.sheet.failure.title',
            },
          }),
        );
      }

      const adaToken = accountTokens.find(
        t => t.tokenId === LOVELACE_TOKEN_ID && t.blockchainName === 'Cardano',
      );

      if (!adaToken) {
        logger.error('ADA token not found for account');
        return of(actions.collateralFlow.insufficientBalance());
      }

      const selfAddress = firstAddress.address;

      return buildTx(
        {
          accountId: state.accountId,
          blockchainName: 'Cardano',
          serializedTx: '',
          txParams: [
            {
              address: selfAddress,
              tokenTransfers: [
                {
                  normalizedAmount: BigNumber(
                    BigInt(COLLATERAL_AMOUNT_LOVELACES),
                  ),
                  token: adaToken,
                },
              ] as [TokenTransfer, ...TokenTransfer[]],
            },
          ],
          blockchainSpecificSendFlowData: {},
        },
        result => actions.collateralFlow.buildCompleted({ result }),
      );
    }),
  );
};
