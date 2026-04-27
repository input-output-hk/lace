import { describe, expect, it } from 'vitest';

import {
  ContractName,
  MissingContractImplementationError,
  ModuleName,
  MultipleImplementationsError,
  assertModuleCompatibility,
  combineContracts,
  type Contract,
  type LaceModule,
} from '../src';

const contractWithoutDependencies: Contract = {
  name: ContractName('contractWithoutDependencies'),
  contractType: 'sideEffectDependency',
  instance: 'exactly-one',
};

const contractDependency: Contract = {
  name: ContractName('contractDependency'),
  contractType: 'sideEffectDependency',
  instance: 'exactly-one',
};

const zeroOrMoreContractDependency: Contract = {
  name: ContractName('zeroOrMoreContractDependency'),
  contractType: 'sideEffectDependency',
  instance: 'zero-or-more',
};

const contractWithDependency: Contract = {
  name: ContractName('contractWithDependency'),
  contractType: 'sideEffectDependency',
  instance: 'exactly-one',
  dependsOn: combineContracts([contractDependency]),
};

const dependsOnContractWithoutDependencies: LaceModule = {
  moduleName: ModuleName('dependsOnContractWithoutDependencies'),
  implements: combineContracts([]),
  dependsOn: combineContracts([contractWithoutDependencies]),
  addons: {},
};

const implementsContractWithoutDependencies: LaceModule = {
  moduleName: ModuleName('implementsContractWithoutDependencies'),
  implements: combineContracts([contractWithoutDependencies]),
  addons: {},
};

const dependsOnContractWithDependency: LaceModule = {
  moduleName: ModuleName('dependsOnContractWithDependency'),
  implements: combineContracts([]),
  dependsOn: combineContracts([contractWithDependency]),
  addons: {},
};

const implementsContractWithDependency: LaceModule = {
  moduleName: ModuleName('implementsContractWithDependency'),
  implements: combineContracts([contractWithDependency]),
  addons: {},
};

const implementsContractDependency: LaceModule = {
  moduleName: ModuleName('implementsContractDependency'),
  implements: combineContracts([contractDependency]),
  addons: {},
};

const implementsContractWithoutDependencies2: LaceModule = {
  moduleName: ModuleName('implementsContractWithoutDependencies2'),
  implements: combineContracts([contractWithoutDependencies]),
  addons: {},
};

const multiInstanceContract: Contract = {
  name: ContractName('multiInstanceContract'),
  contractType: 'sideEffectDependency',
  instance: 'at-least-one',
};

const implementsMultiInstanceContract: LaceModule = {
  moduleName: ModuleName('implementsMultiInstanceContract'),
  implements: combineContracts([multiInstanceContract]),
  addons: {},
};

const dependsOnZeroOrMoreContract: LaceModule = {
  moduleName: ModuleName('dependsOnZeroOrMoreContract'),
  implements: combineContracts([]),
  dependsOn: combineContracts([zeroOrMoreContractDependency]),
  addons: {},
};

const implementsMultiInstanceContract2: LaceModule = {
  moduleName: ModuleName('implementsMultiInstanceContract2'),
  implements: combineContracts([multiInstanceContract]),
  addons: {},
};

describe('assertModuleCompatibility', () => {
  it('does not throw when all dependencies are implemented', () => {
    expect(() => {
      assertModuleCompatibility([
        dependsOnContractWithoutDependencies,
        implementsContractWithoutDependencies,
        dependsOnContractWithDependency,
        implementsContractWithDependency,
        implementsContractDependency,
      ]);
    }).not.toThrow();
  });

  it('throws when direct (module) dependency is not implemented', () => {
    expect(() => {
      assertModuleCompatibility([dependsOnContractWithoutDependencies]);
    }).toThrow(MissingContractImplementationError);
  });

  it('throws when indirect (contract) dependency is not implemented', () => {
    expect(() => {
      assertModuleCompatibility([
        dependsOnContractWithDependency,
        implementsContractWithDependency,
        // missing 'implementsContractDependency'
      ]);
    }).toThrow(MissingContractImplementationError);
  });

  it('throws when indirect (contract) dependency is not implemented', () => {
    expect(() => {
      assertModuleCompatibility([
        dependsOnContractWithDependency,
        implementsContractWithDependency,
        // missing 'implementsContractDependency'
      ]);
    }).toThrow(MissingContractImplementationError);
  });

  it('throws when there are multiple implementations of non-multi-instance contract', () => {
    expect(() => {
      assertModuleCompatibility([
        dependsOnContractWithoutDependencies,
        implementsContractWithoutDependencies,
        implementsContractWithoutDependencies2,
      ]);
    }).toThrow(MultipleImplementationsError);
  });

  it('does not throw when there are multiple implementations of a multi-instance contract', () => {
    expect(() => {
      assertModuleCompatibility([
        implementsMultiInstanceContract,
        implementsMultiInstanceContract2,
      ]);
    }).not.toThrow(MultipleImplementationsError);
  });

  it('does not throw when zero-or-more contract implementation is missing', () => {
    expect(() => {
      assertModuleCompatibility([dependsOnZeroOrMoreContract]);
    }).not.toThrow();
  });
});
