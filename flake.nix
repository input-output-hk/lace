{

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    cardano-node = {
      url = "github:input-output-hk/cardano-node/ebc7be471b30e5931b35f9bbc236d21c375b91bb";
      inputs = {
        cardano-node-workbench.follows = "";
        node-measured.follows = "";
        node-snapshot.follows = "";
        node-process.follows = "";
      };
    };
    cardano-js-sdk.url = "github:input-output-hk/cardano-js-sdk/693689d3f457799c674bed51878a7078b7ddbd0e";
  };

  outputs = inputs: let
    supportedSystem = ["x86_64-linux" "x86_64-darwin" "aarch64-darwin"];
    inherit (inputs.nixpkgs) lib;
  in {
    packages = lib.genAttrs supportedSystem (buildSystem:
      import ./nix/lace-blockchain-services/packages.nix { inherit inputs buildSystem; }
    );

    internal = {
      lace-blockchain-services = import ./nix/lace-blockchain-services/internal.nix { inherit inputs; };
    };

    hydraJobs = {
      lace-blockchain-services-installer = {
        x86_64-linux   = inputs.self.packages.x86_64-linux.lace-blockchain-services-installer;
        # Uncomment once implemented:
        # x86_64-windows = inputs.self.packages.x86_64-linux.lace-blockchain-services-installer-x86_64-windows;
        # x86_64-darwin  = inputs.self.packages.x86_64-darwin.lace-blockchain-services-installer;
        # aarch64-darwin  = inputs.self.packages.aarch64-darwin.lace-blockchain-services-installer;
      };
    };
  };

}
