{
  inputs,
  cell,
}:
assert inputs.nixpkgs.system == "x86_64-linux"; # cross-building for Windows on Linux

  let
    pkgs = inputs.nixpkgs;
  in {
    package = throw "unimplemented";

    installer = throw "unimplemented";
  }
