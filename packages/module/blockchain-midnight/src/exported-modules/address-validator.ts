import { createObservableHook } from '@lace-lib/util-store';

import type {
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata,
} from '@lace-contract/midnight-context';
import type { SendFlowAddressValidator } from '@lace-contract/send-flow';

type MidnightAddressValidator = SendFlowAddressValidator<
  MidnightSpecificSendFlowData,
  MidnightSpecificTokenMetadata
>;

const { trigger: validateAddress, onRequest: onAddressValidationRequest } =
  createObservableHook<MidnightAddressValidator['validateAddress']>();

export { onAddressValidationRequest };

export const createAddressValidator = () =>
  ({
    blockchainName: 'Midnight',
    validateAddress,
  } satisfies MidnightAddressValidator as SendFlowAddressValidator);

export default createAddressValidator;
