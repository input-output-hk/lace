{
  inputs,
  cell,
}:
assert inputs.nixpkgs.system == "x86_64-linux"; let
  pkgs = inputs.nixpkgs;
in rec {
  package = lace-blockchain-services;

  installer = selfExtractingArchive;

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

  lace-blockchain-services-exe = pkgs.buildGoModule rec {
    name = "lace-blockchain-services";
    src = ./lace-blockchain-services;
    vendorHash = "sha256-1iyb+4faqZAo6IZf7PYx3Dg+H2IULzhBW80c5loXBPw=";
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

  lace-blockchain-services = pkgs.runCommand "lace-blockchain-services" {
    meta.mainProgram = lace-blockchain-services-exe.name;
  } ''
    mkdir -p $out/bin $out/libexec $out/share/lace-blockchain-services
    cp ${lace-blockchain-services-exe}/bin/* $out/bin/
    ln -s ${cardano-node}/bin/* $out/libexec/
    ln -s ${ogmios}/bin/* $out/libexec/
    ln -s ${cardano-js-sdk.nodejs}/bin/node $out/libexec
    ln -s ${pkgs.xclip}/bin/xclip $out/libexec

    mkdir -p $out/share
    ln -s ${cardano-js-sdk}/libexec/source $out/share/cardano-js-sdk
  '';

  nix-bundle-exe = pkgs.fetchFromGitHub {
    owner = "3noch";
    repo = "nix-bundle-exe";
    rev = "3522ae68aa4188f4366ed96b41a5881d6a88af97"; # 2023-05-01T13:59:27Z
    hash = "sha256-K9PT8LVvTLOm3gX9ZFxag0X85DFgB2vvJB+S12disWw=";
  };

  # XXX: this has no dependency on /nix/store on the target machine
  lace-blockchain-services-bundle = let
    unbundled = lace-blockchain-services;
    bundled = (import nix-bundle-exe {
      inherit pkgs;
      bin_dir = "libexec";
      exe_dir = "lib";
      lib_dir = "lib";
    } unbundled).overrideAttrs (drv: {
      meta.mainProgram = lace-blockchain-services-exe.name;
      buildCommand = (
        builtins.replaceStrings
          ["'${unbundled}/bin'"]
          ["'${unbundled}/bin' '${unbundled}/libexec' -follow"]
          drv.buildCommand
      ) + ''
        mkdir -p $out/bin $out/share
        mv $out/libexec/lace-blockchain-services $out/bin/
        cp -r --dereference ${unbundled}/share/. $out/share/ || true  # FIXME: unsafe! broken node_modules symlinks
        cp $(find ${desktopItem} -type f -name '*.desktop') $out/share/template.desktop
        ${pkgs.imagemagick}/bin/convert -background none -size 1024x1024 \
          ${./lace-blockchain-services}/cardano.svg $out/share/icon_large.png
      '';
    });
  in bundled;

  desktopItem = pkgs.makeDesktopItem {
    name = "lace-blockchain-services";
    exec = "INSERT_PATH_HERE";
    desktopName = "Lace Blockchain Services";
    genericName = "Cardano Crypto-Currency Backend";
    comment = "Run the backend for the Lace wallet locally";
    categories = [ "Network" ];
    icon = "INSERT_ICON_PATH_HERE";
  };

  # XXX: Be *super careful* changing this!!! You WILL DELETE user data if you make a mistake. Ping @michalrus
  selfExtractingArchive = let
    scriptTemplate = ''
      #!/bin/sh
      set -eu
      # XXX: no -o pipefail in dash (on debians)
      skip_bytes=$(( 1010101010 - 1000000000 ))
      target="$HOME"/.local/opt/lace-blockchain-services
      if [ -e "$target" ] ; then
        echo "Found previous version of lace-blockchain-services, removing it..."
        chmod -R +w "$target"
        rm -rf "$target"
      fi
      mkdir -p "$target"
      progress_cmd=cat
      if type pv >/dev/null ; then
        total_size=$(stat -c "%s" "$0")
        progress_cmd="pv -s "$((total_size - skip_bytes))
      else
        echo "Note: you don't have \`pv' installed, so we can't show progress"
      fi
      echo "Unpacking..."
      tail -c+$((skip_bytes+1)) "$0" | $progress_cmd | tar -C "$target" -xJ
      echo "Setting up a .desktop entry..."
      mkdir -p "$HOME"/.local/share/applications
      cat "$target"/share/template.desktop \
        | sed -r "s+INSERT_PATH_HERE+$(echo "$target"/bin/*)+g" \
        | sed -r "s+INSERT_ICON_PATH_HERE+$(echo "$target"/share/icon_large.png)+g" \
        >"$HOME"/.local/share/applications/lace-blockchain-services.desktop
      echo "Installed successfully!"
      echo "Now, run:" "$target"/bin/*
      exit 0
    '';
    script = __replaceStrings ["1010101010"] [(toString (1000000000 + __stringLength scriptTemplate))] scriptTemplate;
    revShort =
      if inputs.self ? shortRev
      then builtins.substring 0 9 inputs.self.rev
      else "dirty";
  in pkgs.runCommand "lace-blockchain-services-installer" {
    inherit script;
    passAsFile = [ "script" ];
  } ''
    mkdir -p $out
    target=$out/lace-blockchain-services-${revShort}-x86_64-linux.bin
    cat $scriptPath >$target
    echo 'Compressing...'
    tar -cJ -C ${lace-blockchain-services-bundle} . >>$target
    chmod +x $target
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

    lace_local_backend_workdir="$HOME/.local/share/lace-blockchain-services/$NETWORK"
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
