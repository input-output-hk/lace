{ inputs, targetSystem }:

let
  buildSystem = if targetSystem == "x86_64-windows" then "x86_64-linux" else targetSystem;
  pkgs = inputs.nixpkgs.legacyPackages.${buildSystem};
  inherit (pkgs) lib;
in rec {

  flake-compat = import inputs.cardano-node.inputs.flake-compat;

  cardanoWorldFlake = (flake-compat { src = inputs.cardano-world; }).defaultNix;

  networkConfigs = let
    selectedNetworks = [ "mainnet" "preprod" "preview" ];
    website = cardanoWorldFlake.${buildSystem}.cardano.packages.cardano-config-html-internal;
  in pkgs.runCommand "network-configs" {} (lib.concatMapStringsSep "\n" (network: ''
    mkdir -p $out/${network}
    cp -r ${website}/config/${network}/. $out/${network}
  '') selectedNetworks);

}
