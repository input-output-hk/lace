.PHONY: build-dev-v1-app build-dev-lmp-app build-prod-v1-app build-prod-lmp-app

# Reusable functions
define get-extension-id
$(shell cat apps/browser-extension-wallet/.env.defaults | grep LACE_EXTENSION_ID | cut -d'=' -f2)
endef

define build-v1-app
	@echo "🔨 Building Lace v1 ($(1))..."
	cd ./apps/browser-extension-wallet && \
	yarn cleanup:dist && \
	$(2)WEBPACK_PUBLIC_PATH=/sw/ yarn build:sw && \
	$(2)WEBPACK_PUBLIC_PATH=/app/ yarn build:app && \
	$(2)WEBPACK_PUBLIC_PATH=/app/ yarn build:cs
	@echo "✅ Built to ./apps/browser-extension-wallet/dist"
endef

define build-lmp-app
	@echo "🔨 Building Lace Midnight Preview ($(1))..."
	$(eval EXTENSION_ID := $(call get-extension-id))
	cd ./apps/lace-platform/apps/midnight-extension && \
	rm -rf ./dist && \
	EXTENSION_ID=$(EXTENSION_ID) npm run $(2) && \
	EXTENSION_ID=$(EXTENSION_ID) EXTRA_FEATURE_FLAGS=LMP_BUNDLE WEBPACK_PUBLIC_PATH=/js/sw/ npm run $(3)
	@echo "✅ Built to ./apps/lace-platform/apps/midnight-extension/dist"
endef

# Development builds
build-dev-v1-app:
	$(call build-v1-app,dev,WEBPACK_ENV=dev )

build-dev-lmp-app:
	$(call build-lmp-app,dev,build:dev:app,build:dev:sw)

# Production builds
build-prod-v1-app:
	$(call build-v1-app,prod,)

build-prod-lmp-app:
	$(call build-lmp-app,prod,build:app,build:sw)
