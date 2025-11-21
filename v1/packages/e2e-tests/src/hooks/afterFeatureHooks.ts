import { DockerManager } from '../support/DockerManager';

export const afterFeatureHook = async (): Promise<void> => {
  if (process.env.PRE_STARTED_TREZOR_SERVICES !== 'true' && DockerManager.getContainer()) {
    await DockerManager.downDockerCompose();
  }
};
