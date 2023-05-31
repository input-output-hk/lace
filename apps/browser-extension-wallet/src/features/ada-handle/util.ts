import { Cardano } from '@cardano-sdk/core';
import { IHandle } from '@koralabs/handles-public-api-interfaces';
import { HandleInfo } from './types';

export const toHandleInfo = ({ apiResponse, tip }: { apiResponse: IHandle; tip: Cardano.Tip }): HandleInfo => ({
  handle: apiResponse.name,
  hasDatum: apiResponse.hasDatum,
  resolvedAddresses: {
    cardano: Cardano.PaymentAddress(apiResponse.resolved_addresses.ada)
  },
  resolvedAt: {
    hash: tip.hash,
    slot: tip.slot
  }
});
