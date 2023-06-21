{ inputs, buildSystem }:

let

  prefix = "lace-blockchain-services";

  mkPackages = targetSystem: src: let
    internal = inputs.self.internal.lace-blockchain-services.${targetSystem}; # don’t eval again
    suffix = if buildSystem != targetSystem then "-${targetSystem}" else "";
  in {
    "${prefix}${suffix}" = internal.package;
    "${prefix}-installer${suffix}" = internal.installer;
  };

in {

  "x86_64-linux" =
    mkPackages "x86_64-windows" ./internal/x86_64-windows.nix //
    mkPackages "x86_64-linux" ./internal/x86_64-linux.nix;

  "x86_64-darwin" = mkPackages "x86_64-darwin" ./internal/any-darwin.nix;

  "aarch64-darwin" = mkPackages "aarch64-darwin" ./internal/any-darwin.nix;

}.${buildSystem}
