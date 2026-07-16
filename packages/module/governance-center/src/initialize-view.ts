import type { AvailableAddons } from './index';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { InitializeExtensionView } from '@lace-contract/views';

const initializeView: ContextualLaceInit<
  InitializeExtensionView,
  AvailableAddons
> = () => async () => {
  // No view initialization needed for governance center
};

export default initializeView;
