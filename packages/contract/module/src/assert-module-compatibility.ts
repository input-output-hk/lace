import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import { CustomError } from 'ts-custom-error';

import type { Contract, LaceModule } from './types';
import type { ContractName, ModuleName } from './value-objects';

/**
 * More than one loaded module implements a contract that allows exactly one
 * implementation, such as the storage contract. The message names the
 * contract and the modules.
 */
export class MultipleImplementationsError extends CustomError {
  public constructor(contractName: ContractName, implementors: ModuleName[]) {
    super(
      `Contract "${contractName}" must have exactly 1 instance, but is implemented by multiple modules: [${implementors.join(
        ', ',
      )}]`,
    );
  }
}

/**
 * A loaded module, or a contract it depends on, depends on a contract no
 * loaded module implements. The message names the contract and the chain of
 * dependents that requires it.
 */
export class MissingContractImplementationError extends CustomError {
  public constructor(contractName: ContractName, dependent: string[]) {
    super(
      `Contract "${contractName}" is not implemented by any modules, but is required by: [${dependent.join(
        ' -> ',
      )}]`,
    );
  }
}

type DependencySpec = {
  dependency: Contract;
  dependent: string[];
};
const moduleDependencySpecs = ({
  dependsOn = { contracts: [] },
  moduleName,
}: LaceModule): DependencySpec[] =>
  dependsOn.contracts.map(dependency => ({
    dependency,
    dependent: [moduleName],
  }));
const contractDependencySpecs = (
  { dependsOn = { contracts: [] }, name }: Contract,
  dependent: string[] = [],
): DependencySpec[] =>
  dependsOn.contracts.map(dependency => ({
    dependency,
    dependent: [...dependent, name],
  }));
const flatContractDependencies = (
  contract: Contract,
  dependent: string[],
): DependencySpec[] => {
  return [
    ...contractDependencySpecs(contract, dependent),
    ...(contract.dependsOn?.contracts || []).flatMap(dependentContract =>
      flatContractDependencies(dependentContract, dependent),
    ),
  ];
};

/**
 * Checks that a set of modules fits together, as `createLaceWallet` does
 * before loading them: every contract a module or its contracts depend on is
 * implemented, and no contract that allows one implementation has two.
 *
 * @param modules - The modules to check, as they would be loaded.
 * @throws `MultipleImplementationsError` when a single-instance contract is
 * implemented more than once.
 * @throws `MissingContractImplementationError` when a required contract is not
 * implemented.
 */
export const assertModuleCompatibility = (modules: LaceModule[]) => {
  const contractImplementations = Object.values(
    groupBy(
      modules.flatMap(m => m.implements.contracts),
      contract => contract.name,
    ),
  );

  // assert that non-multi-instance contracts have only 1 implementation loaded
  for (const [implA, implB] of contractImplementations) {
    if (implA.instance === 'exactly-one' && implB) {
      throw new MultipleImplementationsError(
        implA.name,
        modules
          .filter(m => m.implements.contracts.includes(implA))
          .map(m => m.moduleName),
      );
    }
  }

  const requiredContractDependencies = uniqBy(
    [
      ...modules.flatMap(moduleDependencySpecs),
      ...modules.flatMap(({ dependsOn = { contracts: [] }, moduleName }) =>
        dependsOn.contracts.flatMap(contract =>
          flatContractDependencies(contract, [moduleName]),
        ),
      ),
    ],
    ({ dependency }) => dependency.name,
  ).filter(({ dependency }) => dependency.instance !== 'zero-or-more');

  for (const dependencySpec of requiredContractDependencies) {
    if (
      !contractImplementations.some(
        ([impl]) => impl.name === dependencySpec.dependency.name,
      )
    ) {
      throw new MissingContractImplementationError(
        dependencySpec.dependency.name,
        dependencySpec.dependent,
      );
    }
  }
};
