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
	@echo "  cleanup-redundant-artifacts : Cleanup redundant artifacts (allure, coverage, leftovers)"
	@echo "  "
	@echo "  [Generators]"
	@echo "  contract : Create a new contract"
	@echo "  module : Create a new module"
	@echo "  generate : Generate a new NX generator. Ex. make generate name=my-generator"
	@echo "  "
	@echo "  [Midnight]"
	@echo "  midnight-start : Start previously created Midnight containers"
	@echo "  midnight-stop : Stop Midnight containers"
	@echo "  midnight-up : Create (if needed) and start Midnight network, including the wallet dapp, and wait until healthy"
	@echo "  midnight-down : Stop and remove Midnight containers and network"
	@echo "  "
	@echo "  [Test dapps]"
	@echo "  dapps-up : Create and start the Cardano/Bitcoin connector test dapps and wait until healthy"
	@echo "  dapps-down : Stop and remove the connector test dapp containers"
	@echo "  test-env-up : Bring up the full test environment (Midnight stack + connector test dapps)"
	@echo "  test-env-down : Tear down the full test environment"
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

cleanup-redundant-artifacts:
	@echo "├── Cleaning up redundant artifacts..."
	@make cleanup-allure
	@make cleanup-coverage
	@make cleanup-leftovers
	@echo "│   └── Cleanup completed."

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

# Retry wrapper for the image pull that precedes any `compose up`.
#
# Three of the services come from ECR Public - midnight-test-dapp in
# compose/midnight.yml, cip30-test-dapp and bitcoin-test-dapp in
# compose/dapps.yml - and are pulled anonymously. AWS throttles anonymous
# ECR Public pulls per source IP at roughly 1/sec, and GitHub-hosted runners
# share NAT egress with every other job pulling from public.ecr.aws, so the
# nightly failed about a quarter of the time with
#   Error response from daemon: toomanyrequests: Rate exceeded
# while the same pull from a laptop always worked. Authenticating would raise
# the limit ~10x but needs AWS credentials in this repo, which we do not want.
#
# The retry is on `pull`, not on `up`: a pull is idempotent and already-fetched
# layers make later attempts nearly free, whereas retrying `up --wait` would
# also redo the build and the healthcheck wait. Once the images are local, the
# `up` below never touches a registry, so a throttle cannot fail it.
#
# Default backoff is 5s doubling over 5 attempts (5+10+20+40 = 75s worst case),
# which comfortably outlasts a per-second throttle without stretching the
# nightly. Override with COMPOSE_PULL_ATTEMPTS / COMPOSE_PULL_DELAY.
COMPOSE_PULL_ATTEMPTS ?= 5
COMPOSE_PULL_DELAY ?= 5
define compose_pull_retry
	@n=1; d=$(COMPOSE_PULL_DELAY); \
	until $(1) pull; do \
		if [ $$n -ge $(COMPOSE_PULL_ATTEMPTS) ]; then \
			echo "compose pull failed after $$n attempts" >&2; \
			exit 1; \
		fi; \
		echo "compose pull failed (attempt $$n of $(COMPOSE_PULL_ATTEMPTS)), retrying in $${d}s..." >&2; \
		sleep $$d; \
		n=$$((n + 1)); \
		d=$$((d * 2)); \
	done
endef

MIDNIGHT_COMPOSE = docker compose -p midnight -f compose/midnight.yml
midnight-start:
	$(MIDNIGHT_COMPOSE) start

midnight-stop:
	$(MIDNIGHT_COMPOSE) stop

midnight-up:
	$(call compose_pull_retry,$(MIDNIGHT_COMPOSE))
	$(MIDNIGHT_COMPOSE) up --detach --build --wait

midnight-down:
	$(MIDNIGHT_COMPOSE) down --volumes --remove-orphans

DAPPS_COMPOSE = docker compose -p test-dapps -f compose/dapps.yml
dapps-up:
	$(call compose_pull_retry,$(DAPPS_COMPOSE))
	$(DAPPS_COMPOSE) up --detach --wait

dapps-down:
	$(DAPPS_COMPOSE) down --remove-orphans

test-env-up: midnight-up dapps-up

test-env-down: dapps-down midnight-down


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
