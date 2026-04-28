# Define the base directory for the Nx workspace
NX_WORKSPACE_DIR := ./ ./apps ./packages

# Find all coverage directories in the projects
COVERAGE_DIRS := $(shell find $(NX_WORKSPACE_DIR) -type d -name "coverage")

# This target provides a list of available targets and their descriptions.
help:
	@echo "Available commands:"
	@echo "  help : Display this help message"
	@echo "  "
	@echo "  [Cleanup]"
	@echo "  cleanup : Cleanup workspace"
	@echo "  cleanup-allure : Cleanup Allure reports"
	@echo "  cleanup-coverage : Cleanup coverage directories"
	@echo "  cleanup-dist : Cleanup dist directories"
	@echo "  cleanup-node_modules : Cleanup node_modules directories"
	@echo "  cleanup-leftovers : Cleanup leftovers (docs, logs, tmp, tsconfig.tsbuildinfo)"
	@echo "  cleanup-mobile-app-state-ios : Cleanup mobile iOS app state in simulator to allow restart from scratch"
	@echo "  "
	@echo "  [Generators]"
	@echo "  contract : Create a new contract"
	@echo "  module : Create a new module"
	@echo "  generate : Generate a new NX generator. Ex. make generate name=my-generator"
	@echo "  "
	@echo "  [Midnight]"
	@echo "  midnight-start : Start previously created Midnight containers"
	@echo "  midnight-stop : Stop Midnight containers"
	@echo "  midnight-up : Create (if needed) and start Midnight network"
	@echo "  midnight-down : Stop and remove Midnight containers and network"
	@echo "  "
	@echo "  [Misc]"
	@echo "  init : Initialize workspace (install dependencies, reset NX cache, run expo prebuild)"
	@echo "  reset : Reset workspace (runs cleanup and init)"
	@echo "  update-cardano-sdk : Update Cardano JS SDK dependencies"
	@echo "  "
	@echo "  [E2E Tests]"
	@echo "  decrypt-secret-lace-extension-e2e        : Decrypt the wallet data for Lace extension E2E tests"

cleanup:
	@echo "├── Cleaning up workspace..."
	@make cleanup-allure
	@make cleanup-coverage
	@make cleanup-dist
	@make cleanup-leftovers
	@make cleanup-node_modules
	@echo "│   └── Cleanup completed."

cleanup-allure:
	@rm -rf apps/lace-extension-e2e/reports/allure
	@echo "│   ├── Allure directories removed."

cleanup-coverage:
	@for dir in $(NX_WORKSPACE_DIR); do \
		find $$dir -type d -name "coverage" -exec rm -rf {} +; \
	done
	@echo "│   ├── Coverage directories removed."

cleanup-dist:
	@for dir in $(NX_WORKSPACE_DIR); do \
		find $$dir -type d -name "dist" -exec rm -rf {} +; \
	done
	@echo "│   ├── Dist directories removed."

cleanup-node_modules:
	@echo "├── Cleaning up node_modules directories..."
	@for dir in $(NX_WORKSPACE_DIR); do \
		find $$dir -type d -name "node_modules" -exec rm -rf {} +; \
	done
	@rm -rf node_modules
	@echo "│   └── node_modules directories removed."

cleanup-leftovers:
	@for dir in $(NX_WORKSPACE_DIR); do \
		find $$dir -type d -name "docs/typedoc" -exec rm -rf {} +; \
		find $$dir -type d -name "logs" ! -path "*/.git/*" -exec rm -rf {} +; \
		find $$dir -type d -name "tmp" -exec rm -rf {} +; \
		find $$dir -type f -name "tsconfig.tsbuildinfo" -exec rm {} +; \
	done
	@echo "│   ├── Leftovers removed."

cleanup-mobile-app-state-ios:
	@echo "├── Cleaning up mobile iOS app state in simulator..."
	@APP_CONTAINER_DIR=$$(xcrun simctl get_app_container booted io.lace.mobilewallet data); \
	echo  "│   ├── Removing app container directory: $$APP_CONTAINER_DIR"; \
	if [ -z "$$APP_CONTAINER_DIR" ] || [ ! -d "$$APP_CONTAINER_DIR" ]; then \
		echo  "│   ├── Error: App container could not be found."; \
	else \
		rm -rf "$$APP_CONTAINER_DIR"; \
		echo  "│   └── Mobile iOS app simulator state cleaned up. Restart app or use 'cmd + d' to open the developer menu in the simulator and click 'Reload'."; \
	fi

MIDNGIHT_COMPOSE = docker compose -p midnight -f compose/midnight.yml
midnight-start:
	$(MIDNGIHT_COMPOSE) start

midnight-stop:
	$(MIDNGIHT_COMPOSE) stop

midnight-up:
	$(MIDNGIHT_COMPOSE) up --detach

midnight-down:
	$(MIDNGIHT_COMPOSE) down --volumes --remove-orphans

midnight-restart:
	$(MIDNGIHT_COMPOSE) down
	$(MIDNGIHT_COMPOSE) up -d


update-cardano-sdk:
	sh scripts/cardano-sdk-update.sh

contract:
	npx nx generate contract

generate:
	npx nx generate @nx/plugin:generator $(name) --directory=configs/nx-plugin/src/generators/$(name)

module:
	npx nx generate module

expo-init:
	@echo "├── Running expo prebuild..."
	@echo "\n" | tee /dev/tty | npx nx prebuild lace-mobile --clean;

mobile-reset-build-dirs-on-config-change:
	@echo "├── Checking for mobile app config change..."
	@RESULT="$$(./scripts/detect-checksum-change.js apps/lace-mobile/app.json)"; \
	if [ "$$RESULT" = "change-detected" -o "$$RESULT" = "no-base-checksum-file" ]; then \
	  echo "│   └── Re-initializing expo builds."; \
		make expo-init; \
	elif [ "$$RESULT" = "checksum-identical" ]; then \
	  echo "│   └── No change detected."; \
	fi

dev-tools-check:
	@if [ "$$(uname)" = "Darwin" ] && command -v xcodebuild >/dev/null 2>&1; then \
		REQUIRED_VERSION="16.4"; \
		CURRENT_VERSION=$$(xcodebuild -version | head -n 1 | awk '{print $$2}'); \
		if [ "$$CURRENT_VERSION" != "$$REQUIRED_VERSION" ]; then \
			echo "\033[1;33mWARNING: Xcode version mismatch!\033[0m"; \
			echo "\033[1;33mRequired: $$REQUIRED_VERSION\033[0m"; \
			echo "\033[1;33mInstalled: $$CURRENT_VERSION\033[0m"; \
		fi; \
	fi

install:
	@echo "├── Installing dependencies..."
	npm install
	@echo "│   └── Installation completed."
	@echo "├── Resetting NX cache..."
	# Part of 'install' because 'nx' should be installed to run reset command
	@npx nx reset
	@echo "│   └── NX cache reset completed."

init:
	@echo "├── Initializing workspace..."
	@make install
	@make expo-init
	@make dev-tools-check
	@echo "│   └── Initialization completed."

reset:
	@echo "Resetting workspace..."
	@make cleanup
	@make init
	@echo "└── Workspace reset completed."

decrypt-secret-lace-extension-e2e:
	@if [ -f apps/lace-extension-e2e/src/setup/walletConfiguration.ts ]; then \
		rm apps/lace-extension-e2e/src/setup/walletConfiguration.ts; \
	fi
	./apps/lace-extension-e2e/decrypt_secret.sh
