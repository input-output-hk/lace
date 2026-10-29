# @lace-lib/image-url

Builds the urls Lace loads remote images from: the Lace normalizing image proxy
([ADR 42](../../../docs/adr/42-lace-normalizing-image-proxy.md)) and the single
IPFS gateway every IPFS reference is normalized onto.

Pure and platform-free on purpose — react-native never enters this package, so
the Vite-built carbon guest can share the same rules as the react-native apps
through `@lace-lib/ui-toolkit`.

## Deployed-service smoke check

`npx nx run @lace-lib/image-url:smoke-test` uses `IMAGE_PROXY_URL`,
`IMAGE_PROXY_KEY` and `IMAGE_PROXY_SALT` to fetch versioned JPEG and SVG fixtures
through the deployed proxy. It exercises both production URL builders, requires
HTTP 200 with WebP bytes, and is never cached. Missing or partial configuration
prints a skip, matching the builds' all-three-or-none policy.

PR CI and the shell, guest and Carbon build workflows run it before packaging. To use a
local env file without printing credentials, run from the worktree root:

```sh
node --env-file=apps/lace-extension/webpack/.env node_modules/.bin/nx run @lace-lib/image-url:smoke-test
```
