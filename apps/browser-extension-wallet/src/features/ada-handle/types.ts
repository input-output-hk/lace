import { Point, Provider } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';

type Handle = string;

type CardanoAddress =
  | Wallet.Cardano.ByronAddress
  | Wallet.Cardano.PaymentAddress
  | Wallet.Cardano.EnterpriseAddress
  | Wallet.Cardano.PointerAddress;

export interface HandleInfo {
  handle: Handle;
  hasDatum: boolean;
  resolvedAddresses: {
    cardano: CardanoAddress;
  };
  resolvedAt: Point;
}

export interface ResolveHandlesArgs {
  handles: Handle[];
}

export interface HandleProvider extends Provider {
  resolveHandles(args: ResolveHandlesArgs): Promise<HandleInfo[] | null>;
}
