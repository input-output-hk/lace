import path from 'path';

import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  installPackagesTask,
} from '@nx/devkit';

import type { ModuleGeneratorSchema } from './schema';
import type { Tree } from '@nx/devkit';

export const moduleGenerator = async (
  tree: Tree,
  options: ModuleGeneratorSchema,
) => {
  const projectRoot = `packages/module/${options.name}`;
  addProjectConfiguration(tree, options.name, {
    root: projectRoot,
    projectType: 'library',
    sourceRoot: `${projectRoot}/src`,
    targets: {},
  });
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, options);
  await formatFiles(tree);
  return () => {
    installPackagesTask(tree, true);
  };
};

export default moduleGenerator;
