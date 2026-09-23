import { describe, expect, it, vi } from 'vitest';

import { createPassportAccountModule } from '../src/create-passport-account-module';
import { runPassportFlow } from '../src/store/side-effects/passport-flows';
import { restorePassportAccount } from '../src/store/side-effects/restore-account';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';
import type {
  FeeSponsor,
  PassportAuthoriser,
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

const authoriser: PassportAuthoriser = {
  scheme: 'jubjub-schnorr',
  deviceCommitment: vi.fn(),
  devicePublicKey: vi.fn(),
  authorise: vi.fn(),
};
const sponsor: FeeSponsor = { balanceAndSign: vi.fn() };
const prover: PassportProver = { prove: vi.fn(), check: vi.fn() };
const network: PassportNetworkConfig = {
  networkId: 'undeployed',
  indexerUrl: 'https://indexer.example',
  indexerWsUrl: 'wss://indexer.example',
  nodeUrl: 'https://node.example',
  artefactUrl: 'https://artefacts.example',
};

const moduleInitProps = {} as ModuleInitProps;
const moduleInitDependencies = {} as ModuleInitDependencies;

describe('createPassportAccountModule', () => {
  it('returns a module named passport-account implementing both passport contracts', () => {
    const module = createPassportAccountModule({
      authoriser,
      sponsor,
      prover,
      network,
    });

    expect(module.moduleName).toBe('passport-account');
    expect(module.implements.contracts.map(contract => contract.name)).toEqual([
      'passport-store',
      'passport-dependency',
    ]);
  });

  it('exposes the passport actions and selectors as the store context', () => {
    const module = createPassportAccountModule({
      authoriser,
      sponsor,
      prover,
      network,
    });

    expect(module.store?.context.actions.passport).toBeDefined();
    expect(module.store?.context.selectors?.passport).toBeDefined();
  });

  it('resolves store init to the registered side effects, the four injected dependencies and the flows', async () => {
    const module = createPassportAccountModule({
      authoriser,
      sponsor,
      prover,
      network,
    });

    const { default: init } = await module.store!.load();
    const result = await init(moduleInitProps, moduleInitDependencies);

    expect(result.sideEffects).toEqual([
      runPassportFlow,
      restorePassportAccount,
    ]);
    expect(result.sideEffectDependencies).toEqual({
      passportAuthoriser: authoriser,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
      passportFlows: {
        createAccount: expect.any(Function) as unknown,
        signIn: expect.any(Function) as unknown,
        addDevice: expect.any(Function) as unknown,
        removeDevice: expect.any(Function) as unknown,
      },
    });
  });
});
