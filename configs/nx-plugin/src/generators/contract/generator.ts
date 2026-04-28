import path from 'path';

import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  installPackagesTask,
  names,
} from '@nx/devkit';

import type { ContractGeneratorSchema } from './schema';
import type { Tree } from '@nx/devkit';

export const contractGenerator = async (
  tree: Tree,
  options: ContractGeneratorSchema,
) => {
  const projectRoot = `packages/contract/${options.name}`;
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    projectRoot,
    names(options.name),
  );
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree, true);
  };
};

export default contractGenerator;
