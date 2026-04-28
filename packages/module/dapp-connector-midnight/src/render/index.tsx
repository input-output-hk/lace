import {
  PROVE_MIDNIGHT_TRANSACTION_LAYOUT,
  WALLET_UNLOCK_LOCATION,
} from '../const';

import { ProveMidnightTransaction } from './prove-midnight-transaction';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { Render } from '@lace-contract/views';

const renderMap: ContextualLaceInit<Render[], AvailableAddons> = () => {
  return [
    {
      locationPattern: new RegExp(`/?${PROVE_MIDNIGHT_TRANSACTION_LAYOUT}`),
      key: PROVE_MIDNIGHT_TRANSACTION_LAYOUT,
      Component: ProveMidnightTransaction,
    },
    {
      locationPattern: new RegExp(`/?${WALLET_UNLOCK_LOCATION}`),
      key: WALLET_UNLOCK_LOCATION,
      Component: () => null,
    },
  ];
};

export default renderMap;
