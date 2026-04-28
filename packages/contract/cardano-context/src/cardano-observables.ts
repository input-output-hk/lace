import { BehaviorSubject } from 'rxjs';

import type {
  AccountRewardAccountDetailsMap,
  AccountUtxoMap,
  RequiredProtocolParameters,
} from './types';
import type { Cardano } from '@cardano-sdk/core';
import type { AnyAddress } from '@lace-contract/addresses';

/**
 * Observable for Cardano protocol parameters.
 * Updated by side effects that subscribe to the protocolParameters selector.
 */
export const cardanoProtocolParameters$ = new BehaviorSubject<
  RequiredProtocolParameters | undefined
>(undefined);

/**
 * Observable for Cardano network magic.
 * Updated by side effects that subscribe to the chainId selector.
 */
export const cardanoNetworkMagic$ = new BehaviorSubject<
  Cardano.NetworkMagic | undefined
>(undefined);

/**
 * Observable for Cardano account UTXOs.
 * Updated by side effects that subscribe to the accountUtxos selector.
 */
export const cardanoAccountUtxos$ = new BehaviorSubject<AccountUtxoMap>({});

/**
 * Observable for Cardano unspendable account UTXOs.
 * Updated by side effects that subscribe to the accountUtxos selector.
 */
export const cardanoAccountUnspendableUtxos$ =
  new BehaviorSubject<AccountUtxoMap>({});

/**
 * Observable for Cardano addresses.
 * Updated by side effects that subscribe to the addresses selector.
 */
export const cardanoAddresses$ = new BehaviorSubject<AnyAddress[]>([]);

/**
 * Observable for Cardano chain ID.
 * Updated by side effects that subscribe to the chainId selector.
 */
export const cardanoChainId$ = new BehaviorSubject<Cardano.ChainId | undefined>(
  undefined,
);

/**
 * Observable for reward account details (stake key registration status).
 * Updated by side effects that subscribe to the rewardAccountDetails selector.
 */
export const cardanoRewardAccountDetails$ =
  new BehaviorSubject<AccountRewardAccountDetailsMap>({});
