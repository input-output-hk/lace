.PHONY: build-dev-v1-app build-dev-lmp-app build-prod-v1-app build-prod-lmp-app init-submodules install-dependencies create-dot-env setup build-prod build-dev build-bundle

# Reusable functions
define get-extension-id
$(shell cat v1/apps/browser-extension-wallet/.env.defaults | grep LACE_EXTENSION_ID | cut -d'=' -f2)
endef

define build-v1-app
	@echo "🔨 Building Lace v1 ($(1))..."
	bash -c 'source $$NVM_DIR/nvm.sh && cd v1 && (nvm use || true) && EXCLUDE_BROWSER=true yarn build && \
		cd apps/browser-extension-wallet && \
		yarn cleanup:dist && \
		$(2)WEBPACK_PUBLIC_PATH=/sw/ yarn build:sw && \
		$(2)WEBPACK_PUBLIC_PATH=/app/ yarn build:app && \
		$(2)WEBPACK_PUBLIC_PATH=/app/ yarn build:cs'
	@echo "✅ Built to ./v1/apps/browser-extension-wallet/dist"
endef

define build-lmp-app
	@echo "🔨 Building Lace Midnight Preview ($(1))..."
	$(eval EXTENSION_ID := $(call get-extension-id))
	cd ./v2/apps/midnight-extension && \
	rm -rf ./dist && \
	EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) npm run $(2) && \
	EXTENSION_ID=$(EXTENSION_ID) NODE_ENV=$(1) EXTRA_FEATURE_FLAGS=LMP_BUNDLE WEBPACK_PUBLIC_PATH=/js/sw/ npm run $(3)
	@echo "✅ Built to ./v2/apps/midnight-extension/dist"
endef

# Prerequisites
init-submodules:
	git submodule update --init --recursive
	@echo "✅ Submodules initialized"

install-dependencies:
	bash -c 'source $$NVM_DIR/nvm.sh && cd v1 && nvm use && yarn'
	@echo "✅ v1 dependencies installed"
	bash -c 'source $$NVM_DIR/nvm.sh && cd v2 && nvm use && npm i'
	@echo "✅ v2 dependencies installed"

create-dot-env:
	@echo "BLOCKFROST_PROJECT_ID_MAINNET=notused" > v2/apps/midnight-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREPROD=notused" >> v2/apps/midnight-extension/webpack/.env
	@echo "BLOCKFROST_PROJECT_ID_PREVIEW=notused" >> v2/apps/midnight-extension/webpack/.env

setup: init-submodules install-dependencies create-dot-env
	@echo "✅ Setup complete"

# Development builds
build-dev-v1-app:
	$(call build-v1-app,development,WEBPACK_ENV=dev )

build-dev-lmp-app:
	$(call build-lmp-app,development,build:dev:app,build:dev:sw)

# Production builds
build-prod-v1-app:
	$(call build-v1-app,production,)

build-prod-lmp-app:
	$(call build-lmp-app,production,build:app,build:sw)

# Bundle
build-bundle:
	yarn build:bundle
	@echo "✅ Bundle built"

# Full builds
build-prod: build-prod-lmp-app build-prod-v1-app build-bundle
	@echo "✅ Production build complete"

build-dev: build-dev-lmp-app build-dev-v1-app build-bundle
	@echo "✅ Development build complete"
