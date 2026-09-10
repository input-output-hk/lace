```mermaid
flowchart TB
  subgraph app["app"]
    direction TB
    extension["lace-extension"]
    mobile["lace-mobile"]
  end
  subgraph module["packages/module"]
    direction TB
    contract-module["@lace-module/[contract]-*"]
    extension-module["@lace-module/[contract]-extension"]
    mobile-module["@lace-module/[contract]-mobile"]
  end
  subgraph contract["packages/contract"]
    contract-package["@lace-contract/*"]
    contract-package2["@lace-contract/*"]
  end
  subgraph lib["packages/lib"]
    direction TB
    lib-package2["@lace-lib/*"]
    lib-package["@lace-lib/*"]
  end
  app -- Load --> module
  module -- Implement --> contract
  contract-package <--> contract-package2
  app --> contract
  app -- Utilize --> lib
  module -- Utilize --> lib
  contract -- Utilize --> lib
  lib -- Utilize --> contract
  lib-package <-- Utilize --> lib-package2
```

`lib → contract` is an allowed edge: some `@lace-lib/*` packages consume
`@lace-contract/*` types and abstractions (e.g. `ui-toolkit`, `util-hw`,
`util-provider`, `cardano-provider-core`, `bitcoin-provider-core`).

An **app** is the only thing that may reach a module, and it only _loads_ one
(`app -- Load --> module` above). Every other inbound edge is forbidden:
module → module outright ([ADR 14](adr/14-modules-never-import-from-other-modules.md)),
and contract → module / lib → module because they invert the implements
direction — contracts and libs are always loaded, a module only when its
feature flag is on.
