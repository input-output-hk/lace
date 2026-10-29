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
  PassportEncryptionKey,
  PassportNetworkConfig,
  PassportProver,
} from '@lace-contract/passport';

const authoriser: PassportAuthoriser = {
  scheme: 'jubjub-schnorr',
  deviceCommitment: vi.fn(),
  devicePublicKey: vi.fn(),
  authorise: vi.fn(),
};
const encryptionKey: PassportEncryptionKey = {
  readerPublicKey: vi.fn(),
  createKeys: vi.fn(),
  sealToDevice: vi.fn(),
  openInbox: vi.fn(),
  sealGrant: vi.fn(),
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
      encryptionKey,
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

  it('refuses a network config the Midnight clients could not use before building the module', () => {
    expect(() =>
      createPassportAccountModule({
        authoriser,
        encryptionKey,
        sponsor,
        prover,
        network: { ...network, indexerWsUrl: 'https://indexer.example' },
      }),
    ).toThrow(
      'The Passport network indexerWsUrl "https://indexer.example" must use ws: or wss:, not https:.',
    );
  });

  it('exposes the passport actions and selectors as the store context', () => {
    const module = createPassportAccountModule({
      authoriser,
      encryptionKey,
      sponsor,
      prover,
      network,
    });

    expect(module.store?.context.actions.passport).toBeDefined();
    expect(module.store?.context.selectors?.passport).toBeDefined();
  });

  it('resolves store init to the registered side effects, the five injected dependencies and the flows', async () => {
    const module = createPassportAccountModule({
      authoriser,
      encryptionKey,
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
      passportEncryptionKey: encryptionKey,
      passportSponsor: sponsor,
      passportProver: prover,
      passportNetwork: network,
      passportFlows: {
        createAccount: expect.any(Function) as unknown,
        signIn: expect.any(Function) as unknown,
        addDevice: expect.any(Function) as unknown,
        removeDevice: expect.any(Function) as unknown,
        issueGrant: expect.any(Function) as unknown,
        revokeGrant: expect.any(Function) as unknown,
        revokeAllGrants: expect.any(Function) as unknown,
        readShieldedHoldings: expect.any(Function) as unknown,
        installOperations: expect.any(Function) as unknown,
      },
    });
  });
});
