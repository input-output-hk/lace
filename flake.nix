{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = inputs: let
    supportedSystems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = inputs.nixpkgs.lib.genAttrs supportedSystems;

    nixpkgsFor = forAllSystems (system: import inputs.nixpkgs { inherit system; });

  in {
    devShells = forAllSystems (system:
      let
        pkgs = nixpkgsFor.${system};
      in {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            yarn
            python311
            python311Packages.setuptools
            pkg-config
            libsass
            openssl
            gcc
            gnumake
          ] ++ lib.optionals stdenv.isLinux [
            autoreconfHook
            libudev-zero
          ];

          shellHook = ''
            export PATH=$PWD/node_modules/.bin:$PATH
            export PYTHON=${pkgs.python311}/bin/python
            ${pkgs.lib.optionalString pkgs.stdenv.isLinux "export LIBCLANG_PATH=${pkgs.libclang.lib}/lib"}
          '';
        };
      }
    );

    hydraJobs.devShells = inputs.self.devShells;
  };
}
