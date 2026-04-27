import { of } from 'rxjs';

import { validateAddress } from './validate-address';

import type { SendFlowAddressValidator } from '@lace-contract/send-flow';

export const createAddressValidator = (): SendFlowAddressValidator => ({
  blockchainName: 'Bitcoin',
  validateAddress: ({ address, network }) =>
    of(validateAddress({ address, network }).map(() => 'invalid' as const)),
});

export default createAddressValidator;
