{ inputs, buildSystem }:

let

  prefix = "blockchain-services";

  mkPackages = targetSystem: let
    internal = inputs.self.internal.${prefix}.${targetSystem}; # don’t eval again
    suffix = if buildSystem != targetSystem then "-${targetSystem}" else "";
  in {
    "${prefix}${suffix}" = internal.package;
    "${prefix}-installer${suffix}" = internal.installer;
  };

in {
  x86_64-linux = mkPackages "x86_64-windows" // mkPackages "x86_64-linux";
  x86_64-darwin = mkPackages "x86_64-darwin";
  aarch64-darwin = mkPackages "aarch64-darwin";
}.${buildSystem}
