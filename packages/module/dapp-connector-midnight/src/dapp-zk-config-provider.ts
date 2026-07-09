import {
  ZKConfigProvider,
  createZKIR,
  createProverKey,
  createVerifierKey,
} from '@midnight-ntwrk/midnight-js-types';

import type { KeyMaterialProvider } from '@midnight-ntwrk/dapp-connector-api';

export class DappZkConfigProvider extends ZKConfigProvider<string> {
  readonly #keyMaterialProvider: KeyMaterialProvider;

  public constructor(keyMaterialProvider: KeyMaterialProvider) {
    super();
    this.#keyMaterialProvider = keyMaterialProvider;
  }

  public getZKIR = async (circuitId: string) =>
    createZKIR(await this.#keyMaterialProvider.getZKIR(circuitId));

  public getProverKey = async (circuitId: string) =>
    createProverKey(await this.#keyMaterialProvider.getProverKey(circuitId));

  public getVerifierKey = async (circuitId: string) =>
    createVerifierKey(
      await this.#keyMaterialProvider.getVerifierKey(circuitId),
    );
}
