import { signerAuthFromPrompt } from '@lace-contract/signer';
import { HexBytes } from '@lace-sdk/util';
import { catchError, defer, map, of } from 'rxjs';

import { mapMidnightConfirmError } from './error-mapping';

import type {
  MidnightSignRequest,
  MidnightSignerContext,
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata,
} from '@lace-contract/midnight-context';
import type { SideEffectDependencies } from '@lace-contract/module';
import type {
  TxConfirmationResult,
  TxExecutorImplementation,
} from '@lace-contract/tx-executor';

export const makeConfirmTx = ({
  accessAuthSecret,
  authenticate,
  logger,
  signerFactory,
}: SideEffectDependencies): TxExecutorImplementation<
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata
>['confirmTx'] => {
  return ({
    serializedTx,
    wallet,
    accountId,
    blockchainSpecificSendFlowData,
  }) => {
    const request: MidnightSignRequest = {
      serializedTx: HexBytes(serializedTx),
      flowType: blockchainSpecificSendFlowData.flowType,
    };

    const auth = signerAuthFromPrompt(
      { accessAuthSecret, authenticate },
      {
        cancellable: true,
        confirmButtonLabel: 'authentication-prompt.confirm-button-label',
        message: 'authentication-prompt.message.transaction-confirmation',
      },
    );

    return defer(() => {
      const context: MidnightSignerContext = {
        wallet,
        accountId,
        auth,
      };
      const signer = signerFactory.createTransactionSigner(context);
      return signer.sign(request);
    }).pipe(
      map(result => ({
        serializedTx: result.serializedTx,
        success: true as const,
      })),
      catchError((error: Error) => {
        logger.error(error);
        return of({
          success: false,
          ...mapMidnightConfirmError(error),
        } as TxConfirmationResult);
      }),
    );
  };
};
