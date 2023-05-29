{
  inputs,
  cell,
}: let
  reexport = targetSystem: rec {
    inherit (cell.internal.${targetSystem}) package installer;
    "package-${targetSystem}" = package;
    "installer-${targetSystem}" = installer;
  };
in
  if inputs.nixpkgs.system == "x86_64-linux"
  # `x86_64-linux` remains the "default", i.e. { installer = ...; package = ...; }
  then reexport "x86_64-windows" // reexport inputs.nixpkgs.system
  else if __elem inputs.nixpkgs.system ["x86_64-darwin" "aarch64-darwin"]
  then reexport inputs.nixpkgs.system
  else {}
