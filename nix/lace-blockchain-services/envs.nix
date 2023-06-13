{
  inputs,
  cell,
}: let
  system = inputs.nixpkgs.system;
  pkgs = inputs.nixpkgs;
in
  if system == "x86_64-linux" || system == "x86_64-darwin" || system == "aarch64-darwin"
  then {
    default = pkgs.mkShell {
      buildInputs = (with pkgs; [
        go
      ]);
      shellHook = ''
        # `nix develop` can be run from different subdirectories now, let’s unify:
        PROJECT_DIR="$(${pkgs.gitMinimal}/bin/git rev-parse --show-toplevel)" || {
          echo >&2 'fatal: please run the devshell from within the repository'
          exit 1
        }
        cd "$PROJECT_DIR"

        cd nix/lace-blockchain-services/internal/lace-blockchain-services
      '';
    };
  } else {}
