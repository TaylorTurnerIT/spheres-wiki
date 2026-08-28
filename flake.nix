{
  description = "Spheres Wiki — static reference wiki for the Spheres TTRPG system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        inherit (pkgs) lib stdenv;
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun                # Javascript runtime and package manager
            just               # task runner (just test, just build, etc.)
            git-lfs            # manage large assets (book covers)
          ] ++ lib.optionals stdenv.isLinux [
            vips               # sharp (optional Astro dep) builds against this
            pkg-config
            chromium           # Lighthouse/Puppeteer browser
          ];

          shellHook = ''
            echo "🪐 Spheres Wiki dev shell  •  Bun $(bun --version)"

            if [ ! -d node_modules ]; then
              echo "📦 Installing bun dependencies (one-time)…"
              bun install
            fi

            export PATH="$PWD/node_modules/.bin:$PATH"

            if command -v chromium >/dev/null 2>&1; then
              export CHROME_PATH="$(command -v chromium)"
            fi
          '';
        };
      }
    );
}
