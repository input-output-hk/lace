.PHONY: build-dev-v1-app build-dev-v1-app-firefox build-dev-lmp-app build-dev-v2-app build-prod-v1-app build-prod-v1-app-firefox build-prod-lmp-app build-prod-v2-app init-submodules install-dependencies create-v1-dot-env create-lmp-dot-env create-v2-dot-env setup setup-with-v2 build-prod build-dev build-bundle build-bundle-v2 build-bundle-v1-v2-lmp build-prod-firefox build-dev-firefox build-prod-v2 build-dev-v2 build-prod-v1-v2-lmp build-dev-v1-v2-lmp build-ext build-dev-ext link-v2 unlink-v2

# Submodule symlink configuration
SUBMODULE_PATH := v2
SUBMODULE_BACKUP := $(SUBMODULE_PATH).bak
REPO_PATH ?=
GIT_EXCLUDE_FILE := .git/info/exclude

# Node version manager detection and setup
define setup-node-env
	if command -v fnm >/dev/null 2>&1; then \
		eval "$$(fnm env)" && fnm install && fnm use; \
	elif [ -n "$$NVM_DIR" ] && [ -s "$$NVM_DIR/nvm.sh" ]; then \
		source "$$NVM_DIR/nvm.sh" && nvm install && nvm use; \
	elif command -v nvm >/dev/null 2>&1; then \
		nvm install && nvm use; \
	fi
endef

# Reusable functions
define get-extension-id
$(shell cat v1/apps/browser-extension-wallet/.env.defaults | grep LACE_EXTENSION_ID | cut -d'=' -f2)
endef

define build-v1-app
	@echo "🔨 Building Lace v1 (env=$(1), browser=$(2))..."
	bash -c 'cd v1 && $(setup-node-env) && EXCLUDE_BROWSER=true yarn build && \
		cd apps/browser-extension-wallet && \
		yarn cleanup:dist && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/sw/ yarn build:sw && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/app/ yarn build:app && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/app/ yarn build:cs'
	@echo "✅ Built to ./v1/apps/browser-extension-wallet/dist"
endef

define build-lmp-app
	@echo "🔨 Building Lace Midnight Preview ($(1))..."
	$(eval EXTENSION_ID := $(call get-extension-id))
	bash -c 'cd lmp && $(setup-node-env) && cd apps/midnight-extension && \
	rm -rf ./dist && \
	EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) WEBPACK_PUBLIC_PATH=/js/ npm run $(2) && \
	EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) EXTRA_FEATURE_FLAGS=LMP_BUNDLE WEBPACK_PUBLIC_PATH=/js/sw/ npm run $(3)'
	@echo "✅ Built to ./lmp/apps/midnight-extension/dist"
endef

define build-v2-app
	@echo "🔨 Building Lace Extension ($(1))..."
	$(eval EXTENSION_ID := $(call get-extension-id))
	bash -c 'cd v2 && $(setup-node-env) && cd apps/lace-extension && \
	rm -rf ./dist && \
	NX_WORKSPACE_ROOT=$(CURDIR)/v2 EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) npm run prepare:expo-env && \
	NX_WORKSPACE_ROOT=$(CURDIR)/v2 EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) npm run $(2) && \
	NX_WORKSPACE_ROOT=$(CURDIR)/v2 EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) npm run $(3) && \
	NX_WORKSPACE_ROOT=$(CURDIR)/v2 EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) EXTRA_FEATURE_FLAGS=V2_BUNDLE WEBPACK_PUBLIC_PATH=/js/sw/ npm run $(4)'
	@echo "✅ Built to ./v2/apps/lace-extension/dist"
endef

# Prerequisites
init-submodules:
	@if [ -L "$(SUBMODULE_PATH)" ]; then \
		echo ""; \
		echo "⚠️  WARNING: Skipping submodule init - $(SUBMODULE_PATH) is symlinked to external repo"; \
		echo "⚠️  Run 'make unlink-v2' first if you want to restore and reinitialize the submodule"; \
		echo ""; \
	else \
		git submodule update --init --recursive; \
		echo "✅ Submodules initialized"; \
	fi

install-dependencies:
	yarn install
	@echo "✅ Root dependencies installed"
	bash -c 'cd v1 && $(setup-node-env) && yarn'
	@echo "✅ v1 dependencies installed"
	bash -c 'cd v2 && $(setup-node-env) && npm i'
	@echo "✅ v2 dependencies installed"
	bash -c 'cd lmp && $(setup-node-env) && npm i'
	@echo "✅ lmp dependencies installed"

create-v1-dot-env:
	@if [ -f "v1/apps/browser-extension-wallet/.env" ]; then \
		echo "ℹ️  v1/apps/browser-extension-wallet/.env already exists, skipping"; \
	else \
		if [ -z "$(BLOCKFROST_PROJECT_ID_MAINNET)" ] || [ -z "$(BLOCKFROST_PROJECT_ID_PREPROD)" ] || [ -z "$(BLOCKFROST_PROJECT_ID_PREVIEW)" ]; then \
			echo "❌ Error: Blockfrost project IDs are required"; \
			echo "Usage: make create-v1-dot-env BLOCKFROST_PROJECT_ID_MAINNET=xxx BLOCKFROST_PROJECT_ID_PREPROD=xxx BLOCKFROST_PROJECT_ID_PREVIEW=xxx"; \
			exit 1; \
		fi; \
		echo "LACE_EXTENSION_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAka60JHxHX0cwGYYMYLqLLzFOXcKyPo0JJAMqb0UE1htxfx5o3KBQGrOhlhzfUHtSNiSHBxdV+MEoICbogHPZu/vRF+4KRATzEjd+/2KCLKpjn2xvG3ay+WvFi5vhzk8h0dJelLKIX8lR0C31B+HU4oiwP+DwPTjlMELRZM68HxCXZ2UjY4VIkbNyWjKmsmuUwP2k7ul6vD/5ePEac69KRFI9Z+aI7kg0UnVbDYg+jJDupHlVGtxnbrjsBwEhUHISFZbGuSjtnFDNf2LHN1iReVlfpg1kJFvj9chaULo64iMjsp+eCoVtZHq1OTAm03jpNOp3k2sRluBQz2wk5zjnswIDAQAB" > v1/apps/browser-extension-wallet/.env; \
		echo "BLOCKFROST_PROJECT_ID_MAINNET=$(BLOCKFROST_PROJECT_ID_MAINNET)" >> v1/apps/browser-extension-wallet/.env; \
		echo "BLOCKFROST_PROJECT_ID_PREPROD=$(BLOCKFROST_PROJECT_ID_PREPROD)" >> v1/apps/browser-extension-wallet/.env; \
		echo "BLOCKFROST_PROJECT_ID_PREVIEW=$(BLOCKFROST_PROJECT_ID_PREVIEW)" >> v1/apps/browser-extension-wallet/.env; \
		echo "📝 Created v1/apps/browser-extension-wallet/.env"; \
	fi

create-lmp-dot-env:
	@echo "BLOCKFROST_PROJECT_ID_MAINNET=notused" > lmp/apps/midnight-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREPROD=notused" >> lmp/apps/midnight-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREVIEW=notused" >> lmp/apps/midnight-extension/webpack/.env
	@echo "📝 Created lmp/apps/midnight-extension/webpack/.env"

create-v2-dot-env:
	@echo "BLOCKFROST_PROJECT_ID_MAINNET=notused" > v2/apps/lace-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREPROD=notused" >> v2/apps/lace-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREVIEW=notused" >> v2/apps/lace-extension/webpack/.env
	@echo "📝 Created v2/apps/lace-extension/webpack/.env"

setup: init-submodules install-dependencies create-lmp-dot-env
	@echo "✅ Setup complete"

setup-with-v2: init-submodules install-dependencies create-v2-dot-env
	@echo "✅ Setup complete with v2"

# Development builds
build-dev-v1-app:
	$(call build-v1-app,dev,chrome)

build-dev-v1-app-firefox:
	$(call build-v1-app,dev,firefox)

build-dev-lmp-app:
	$(call build-lmp-app,development,build:dev:app,build:dev:sw)

build-dev-v2-app:
	$(call build-v2-app,development,build:dev:tab,build:dev:app,build:dev:sw)

# Production builds
build-prod-v1-app:
	$(call build-v1-app,prod,chrome)

build-prod-v1-app-firefox:
	$(call build-v1-app,prod,firefox)

build-prod-lmp-app:
	$(call build-lmp-app,production,build:app,build:sw)

build-prod-v2-app:
	$(call build-v2-app,production,build:tab,build:app,build:sw)

# Bundle
build-bundle:
	BUILD_TARGET=lmp yarn build:bundle
	@echo "✅ Bundle built"

build-bundle-v2:
	BUILD_TARGET=v2 yarn build:bundle
	@echo "✅ Bundle built with v2"

build-bundle-v1-v2-lmp:
	BUILD_TARGET=v2+lmp yarn build:bundle
	@echo "✅ Bundle built with v1+v2+lmp"

# Fast rebuild (browser-extension-wallet only, skips v1 packages and v2)
define rebuild-v1-app-only
	@echo "🔨 Rebuilding browser-extension-wallet only (env=$(1), browser=$(2))..."
	bash -c 'cd v1/apps/browser-extension-wallet && $(setup-node-env) && \
		yarn cleanup:dist && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/sw/ yarn build:sw && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/app/ yarn build:app && \
		WEBPACK_ENV=$(1) BROWSER=$(2) WEBPACK_PUBLIC_PATH=/app/ yarn build:cs'
	@echo "✅ Built to ./v1/apps/browser-extension-wallet/dist"
endef

build-ext:
	$(call rebuild-v1-app-only,prod,chrome)
	$(MAKE) build-bundle
	@echo "✅ Extension build complete (Chrome)"

build-dev-ext:
	$(call rebuild-v1-app-only,dev,chrome)
	$(MAKE) build-bundle
	@echo "✅ Extension dev build complete (Chrome)"

# Full builds (Chrome)
build-prod: build-prod-lmp-app build-prod-v1-app build-bundle
	@echo "✅ Production build complete (Chrome)"

build-dev: build-dev-lmp-app build-dev-v1-app build-bundle
	@echo "✅ Development build complete (Chrome)"

# Full builds with v2 (Chrome)
build-prod-v2: build-prod-v2-app build-prod-v1-app build-bundle-v2
	@echo "✅ Production build complete (Chrome) with v2"

build-dev-v2: build-dev-v2-app build-dev-v1-app build-bundle-v2
	@echo "✅ Development build complete (Chrome) with v2"

# Full builds with v2+lmp (Chrome)
build-prod-v1-v2-lmp: build-prod-v2-app build-prod-lmp-app build-prod-v1-app build-bundle-v1-v2-lmp
	@echo "✅ Production build complete (Chrome) with v1+v2+lmp"

build-dev-v1-v2-lmp: build-dev-v2-app build-dev-lmp-app build-dev-v1-app build-bundle-v1-v2-lmp
	@echo "✅ Development build complete (Chrome) with v1+v2+lmp"

# Full builds (Firefox)
build-prod-firefox: build-prod-lmp-app build-prod-v1-app-firefox build-bundle
	@echo "✅ Production build complete (Firefox)"

build-dev-firefox: build-dev-lmp-app build-dev-v1-app-firefox build-bundle
	@echo "✅ Development build complete (Firefox)"

# Submodule symlink development
# Link v2 submodule to standalone repo:
#   make link-v2 REPO_PATH=~/my-work-dir/lace-platform
#
# Unlink and restore original submodule:
#   make unlink-v2

link-v2:
	@if [ -z "$(REPO_PATH)" ]; then \
		echo "❌ Error: REPO_PATH is required"; \
		echo "Usage: make link-v2 REPO_PATH=~/my-work-dir/lace-platform"; \
		exit 1; \
	fi
	@if [ -L "$(SUBMODULE_PATH)" ]; then \
		echo "ℹ️  $(SUBMODULE_PATH) is already linked, unlinking first..."; \
		rm "$(SUBMODULE_PATH)"; \
	fi
	@if [ -d "$(SUBMODULE_BACKUP)" ] && [ -d "$(SUBMODULE_PATH)" ]; then \
		echo "⚠️  Recovering from stuck state: removing stale $(SUBMODULE_PATH)..."; \
		rm -rf "$(SUBMODULE_PATH)"; \
	fi
	@if [ -d "$(SUBMODULE_BACKUP)" ] && [ ! -d "$(SUBMODULE_PATH)" ]; then \
		echo "⚠️  Recovering from stuck state: restoring $(SUBMODULE_PATH) from backup..."; \
		mv "$(SUBMODULE_BACKUP)" "$(SUBMODULE_PATH)"; \
	fi
	@if [ ! -d "$(SUBMODULE_PATH)" ]; then \
		echo "❌ Error: $(SUBMODULE_PATH) directory does not exist"; \
		exit 1; \
	fi
	@EXPANDED_PATH=$$(eval echo "$(REPO_PATH)"); \
	if [ ! -d "$$EXPANDED_PATH" ]; then \
		echo "❌ Error: Target path $$EXPANDED_PATH does not exist"; \
		exit 1; \
	fi
	@if [ ! -f "$(SUBMODULE_PATH)/.git" ] && [ ! -d "$(SUBMODULE_PATH)/.git" ]; then \
		echo ""; \
		echo "⚠️  WARNING: $(SUBMODULE_PATH) submodule is not initialized"; \
		echo "⚠️  Proceeding anyway - 'make unlink-v2' will initialize it when restoring"; \
		echo ""; \
	fi
	@echo "🔇 Disabling submodule in git..."
	@git submodule deinit -f $(SUBMODULE_PATH) 2>/dev/null || true
	@git config submodule.$(SUBMODULE_PATH).active false
	@git config submodule.$(SUBMODULE_PATH).ignore all
	@git update-index --skip-worktree $(SUBMODULE_PATH) 2>/dev/null || true
	@echo "📦 Backing up $(SUBMODULE_PATH) to $(SUBMODULE_BACKUP)..."
	@mv "$(SUBMODULE_PATH)" "$(SUBMODULE_BACKUP)"
	@if [ -e "$(SUBMODULE_PATH)" ] || [ -L "$(SUBMODULE_PATH)" ]; then \
		rm -rf "$(SUBMODULE_PATH)"; \
	fi
	@EXPANDED_PATH=$$(eval echo "$(REPO_PATH)"); \
	echo "🔗 Creating symlink $(SUBMODULE_PATH) -> $$EXPANDED_PATH..."; \
	ln -s "$$EXPANDED_PATH" "$(SUBMODULE_PATH)"
	@if ! grep -q "^$(SUBMODULE_PATH)$$" "$(GIT_EXCLUDE_FILE)" 2>/dev/null; then \
		echo "$(SUBMODULE_PATH)" >> "$(GIT_EXCLUDE_FILE)"; \
		echo "📝 Added $(SUBMODULE_PATH) to $(GIT_EXCLUDE_FILE)"; \
	fi
	@if ! grep -q "^$(SUBMODULE_BACKUP)$$" "$(GIT_EXCLUDE_FILE)" 2>/dev/null; then \
		echo "$(SUBMODULE_BACKUP)" >> "$(GIT_EXCLUDE_FILE)"; \
		echo "📝 Added $(SUBMODULE_BACKUP) to $(GIT_EXCLUDE_FILE)"; \
	fi
	@echo "✅ Submodule linked successfully"

unlink-v2:
	@if [ ! -L "$(SUBMODULE_PATH)" ] && [ ! -d "$(SUBMODULE_BACKUP)" ]; then \
		echo "ℹ️  $(SUBMODULE_PATH) is not linked, nothing to do"; \
	else \
		if [ ! -L "$(SUBMODULE_PATH)" ] && [ -d "$(SUBMODULE_BACKUP)" ]; then \
			echo "⚠️  Recovering from stuck state: $(SUBMODULE_PATH) is not a symlink but backup exists"; \
			if [ -d "$(SUBMODULE_PATH)" ]; then \
				rm -rf "$(SUBMODULE_PATH)"; \
				echo "🗑️  Removed stale $(SUBMODULE_PATH)"; \
			fi; \
		fi; \
		if [ -L "$(SUBMODULE_PATH)" ]; then \
			echo "🔗 Removing symlink $(SUBMODULE_PATH)..."; \
			rm "$(SUBMODULE_PATH)"; \
		fi; \
		if [ ! -d "$(SUBMODULE_BACKUP)" ]; then \
			echo "ℹ️  No backup found, reinitializing submodule..."; \
		fi; \
		if [ -d "$(SUBMODULE_BACKUP)" ]; then \
			echo "📦 Restoring $(SUBMODULE_BACKUP) to $(SUBMODULE_PATH)..."; \
			mv "$(SUBMODULE_BACKUP)" "$(SUBMODULE_PATH)"; \
		fi; \
		if grep -q "^$(SUBMODULE_PATH)$$" "$(GIT_EXCLUDE_FILE)" 2>/dev/null; then \
			sed -i '' '/^$(SUBMODULE_PATH)$$/d' "$(GIT_EXCLUDE_FILE)"; \
			echo "📝 Removed $(SUBMODULE_PATH) from $(GIT_EXCLUDE_FILE)"; \
		fi; \
		if grep -q "^$(SUBMODULE_BACKUP)$$" "$(GIT_EXCLUDE_FILE)" 2>/dev/null; then \
			sed -i '' '/^$(SUBMODULE_BACKUP)$$/d' "$(GIT_EXCLUDE_FILE)"; \
			echo "📝 Removed $(SUBMODULE_BACKUP) from $(GIT_EXCLUDE_FILE)"; \
		fi; \
		echo "🔄 Re-enabling submodule in git..."; \
		git update-index --no-skip-worktree $(SUBMODULE_PATH) 2>/dev/null || true; \
		git config submodule.$(SUBMODULE_PATH).active true; \
		git config --unset submodule.$(SUBMODULE_PATH).ignore 2>/dev/null || true; \
		echo "🔄 Updating submodule to committed hash..."; \
		git submodule update --init "$(SUBMODULE_PATH)"; \
		echo "📦 Reinstalling v2 dependencies..."; \
		bash -c 'cd $(SUBMODULE_PATH) && $(setup-node-env) && npm i'; \
		$(MAKE) create-lmp-dot-env; \
		echo "✅ Submodule unlinked and restored successfully"; \
	fi
