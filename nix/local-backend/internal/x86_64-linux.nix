{
  inputs,
  cell,
}:
assert inputs.nixpkgs.system == "x86_64-linux"; let
  pkgs = inputs.nixpkgs;
in rec {
  package = local-backend;

  installer = throw "unimplemented";

  flake-compat = import inputs.cardano-node.inputs.flake-compat;

  # XXX: whenever updating Ogmios, make sure to update `ogmiosInputs` below (based on `${ogmiosSrc}/default.nix`):
  ogmiosSrc = pkgs.fetchFromGitHub {
    owner = "CardanoSolutions";
    repo = "ogmios";
    rev = "v5.6.0";
    hash = "sha256-nCNz/aDDKPVhphM7RnlD81aZC2x7cEzlD+aD4qMA2Sc=";
  };

  ogmiosInputs = {
    haskellNix = let
      self = flake-compat {
        src = pkgs.fetchzip {
          url = "https://github.com/input-output-hk/haskell.nix/archive/0.0.117.tar.gz";
          hash = "sha256-oSlxyFCsmG/z1Vks8RT94ZagrzTPT/WMwT7OOiEsyzI=";
        };
      };
    in self.defaultNix // (self.defaultNix.internal.compat { inherit (pkgs) system; });

    iohkNix = import (pkgs.fetchzip {
      url = "https://github.com/input-output-hk/iohk-nix/archive/edb2d2df2ebe42bbdf03a0711115cf6213c9d366.tar.gz";
      hash = "sha256-wveDdPsgB/3nAGAdFaxrcgLEpdi0aJ5kEVNtI+YqVfo=";
    }) {};

    cardanoPkgs = pkgs.fetchzip {
      url = "https://github.com/input-output-hk/cardano-haskell-packages/archive/316e0a626fed1a928e659c7fc2577c7773770f7f.tar.gz";
      hash = "sha256-RCd29xb0ZDZj5u9v9+dykv6nWs6pcEBsAyChm9Ut3To=";
    };
  };

  ogmios = (import ogmiosSrc (ogmiosInputs // {
    inherit (pkgs) system;
    nixpkgsArgs = { inherit (pkgs) system; };
  })).platform.amd64;

  cardano-js-sdk = inputs.cardanojs-live-mainnet.packages.${pkgs.system}.default;

  cardano-node = inputs.cardano-node.packages.${pkgs.system}.cardano-node;

  # ----------------------------------------------------------------------------- #

  local-backend-exe = pkgs.buildGoModule rec {
    name = "local-backend";
    src = ./local-backend;
    vendorHash = "sha256-Aek1n2h4YCvwnGwlFSoGMvk3LNby/UPSl3er5hhbqSs=";
    nativeBuildInputs = with pkgs; [ pkgconfig imagemagick go-bindata ];
    buildInputs = with pkgs; [ libayatana-appindicator-gtk3 gtk3 ];
    overrideModAttrs = oldAttrs: {
      buildInputs = (oldAttrs.buildInputs or []) ++ buildInputs;
    };
    preBuild = ''
      convert -background none -size 44x44 cardano.svg cardano.png
      go-bindata -pkg main -o assets.go cardano.png
    '';
  };

  local-backend = pkgs.runCommand "local-backend" {
    meta.mainProgram = local-backend-exe.name;
  } ''
    mkdir -p $out/bin $out/libexec $out/share/lace-local-backend
    cp ${local-backend-exe}/bin/* $out/bin/
    ln -s ${cardano-node}/bin/* $out/libexec/
    ln -s ${ogmios}/bin/* $out/libexec/
    ln -s ${cardano-js-sdk.nodejs}/bin/node $out/libexec

    mkdir -p $out/share/lace-local-backend/cardano-node-config
    ln -s ${cardano-js-sdk}/libexec/source $out/share/lace-local-backend/cardano-js-sdk
  '';

  # ----------------------------------------------------------------------------- #

  debug-servers = pkgs.writeShellScriptBin "debug-servers" ''
    set -euo pipefail

    # Kill children on exit:
    trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

    # TODO: USE_BLOCKFROST=true?
    # TODO: in the future, we want more than `tx-submit` – full SERVICE_NAMES contained more: requiring PosgreSQL+cardano-db-sync: asset,chain-history,network-info,rewards,stake-pool,utxo

    # TODO: get a random free port each time:
    ogmios_port=1339

    # TODO: get a random free port each time:
    cardano_node_port=36293

    cardano_services_port=3000

    export NETWORK=mainnet

    if [ "$NETWORK" = "mainnet" ] ; then
      export TOKEN_METADATA_SERVER_URL="https://tokens.cardano.org"
    else
      export TOKEN_METADATA_SERVER_URL="https://metadata.cardano-testnet.iohkdev.io/"
    fi

    export CARDANO_NODE_CONFIG_PATH="${cardano-js-sdk}/libexec/source/packages/cardano-services/config/network/$NETWORK/cardano-node/config.json"

    export API_URL="http://0.0.0.0:$cardano_services_port"
    export ENABLE_METRICS=true
    export LOGGER_MIN_SEVERITY=info
    export SERVICE_NAMES="tx-submit"
    export USE_QUEUE=false
    export USE_BLOCKFROST=false

    export OGMIOS_URL="ws://127.0.0.1:$ogmios_port"

    lace_local_backend_workdir="$HOME/.local/share/lace-local-backend/$NETWORK"
    mkdir -p "$lace_local_backend_workdir"

    cardano_node_socket="$lace_local_backend_workdir"/cardano-node.socket
    rm -f "$cardano_node_socket"

    cd "$lace_local_backend_workdir"

    echo "Starting cardano-node…"
    (
      ${cardano-node}/bin/cardano-node run \
        --topology "$(dirname "$CARDANO_NODE_CONFIG_PATH")/topology.json" \
        --database-path "$lace_local_backend_workdir/chain" \
        --port "$cardano_node_port" \
        --host-addr 0.0.0.0 \
        --config "$CARDANO_NODE_CONFIG_PATH" \
        --socket-path "$cardano_node_socket" \
        2>&1 | sed -r 's/^/[cardano-node] /' | ${pkgs.moreutils}/bin/ts '[%Y-%m-%dT%H:%M:%.S%z]'
    ) &

    while [ ! -e "$cardano_node_socket" ] ; do
      echo "Waiting for ‘$cardano_node_socket’ to appear…"
      sleep 1
    done

    echo "Starting ogmios…"
    (
      ${ogmios}/bin/ogmios \
        --host 127.0.0.1 \
        --port "$ogmios_port" \
        --node-config "$CARDANO_NODE_CONFIG_PATH" \
        --node-socket "$cardano_node_socket" \
        2>&1 | sed -r 's/^/[ogmios] /' | ${pkgs.moreutils}/bin/ts '[%Y-%m-%dT%H:%M:%.S%z]'
    ) &

    while [ "$(${pkgs.curl}/bin/curl -so /dev/null -w "%{http_code}" "http://127.0.0.1:$ogmios_port/health")" != "200" ] ; do
      echo "Waiting for ‘http://127.0.0.1:$ogmios_port/health’ to return 200…"
      sleep 1
    done

    echo "Starting cardano-services…"
    ${cardano-js-sdk}/libexec/source/packages/cardano-services/dist/cjs/cli.js start-provider-server \
      2>&1 | sed -r 's/^/[cardano-services] /' | ${pkgs.moreutils}/bin/ts '[%Y-%m-%dT%H:%M:%.S%z]'
  '';

}
