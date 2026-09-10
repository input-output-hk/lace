import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { VaultCapabilities } from '@lace-contract/vault';

export const loadVaultCapabilities: ContextualLaceInit<
  VaultCapabilities,
  AvailableAddons
> = () => ({
  create: true,
  import: true,
  connectHardware: true,
  addAccount: true,
  renameAccount: true,
});

export default loadVaultCapabilities;
