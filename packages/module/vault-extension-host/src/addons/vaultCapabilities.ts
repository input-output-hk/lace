import { hasLaceCapability } from '@lace-lib/extension-shell-client';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';
import type { VaultCapabilities } from '@lace-contract/vault';

// Feature detection off the injected host (ADR 41): each ceremony is enabled
// only when `window.lace` is present AND advertises the matching op. An
// unembedded dev guest (no `window.lace`) reports all false — the entry points
// stay hidden, not dead.
export const loadVaultCapabilities: ContextualLaceInit<
  VaultCapabilities,
  AvailableAddons
> = () => ({
  create: hasLaceCapability('wallets.requestCreate'),
  import: hasLaceCapability('wallets.requestImport'),
  connectHardware: hasLaceCapability('wallets.requestConnectHardware'),
  addAccount: hasLaceCapability('wallets.requestManager'),
  // Its own probe, not `wallets.requestManager`: a host predating the
  // account-rename view DROPS the unknown view hint and mounts the plain list,
  // so only the separately advertised method tells the two apart.
  renameAccount: hasLaceCapability('wallets.requestRenameAccount'),
});

export default loadVaultCapabilities;
