import type { Cardano } from '..';
import type { Percent } from '@lace-lib/util/common';
import type { Logger } from 'ts-log';

export type HealthCheckResponse = {
  ok: boolean;
  localNode?: {
    ledgerTip?: Cardano.Tip;
    networkSync?: Percent;
  };
  projectedTip?: Cardano.Tip;
  reason?: string;
};

export interface ProviderDependencies {
  logger: Logger;
}

export interface Provider {
  /**
   * @throws ProviderError
   */
  healthCheck(): Promise<HealthCheckResponse>;
}

export type HttpProviderConfigPaths<T extends Provider> = {
  [methodName in keyof T]: string;
};
