import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
import { CustomError } from 'ts-custom-error';

import type { Contract, LaceModule } from './types';
import type { ContractName, ModuleName } from './value-objects';

export class MultipleImplementationsError extends CustomError {
  public constructor(contractName: ContractName, implementors: ModuleName[]) {
    super(
      `Contract "${contractName}" must have exactly 1 instance, but is implemented by multiple modules: [${implementors.join(
        ', ',
      )}]`,
    );
  }
}

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
