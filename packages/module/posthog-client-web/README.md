# @lace-module/posthog-client-web

PostHog client for a plain web page (the carbon guest), speaking PostHog's HTTP
API over `fetch`.

`posthog-node` is not usable here (it targets a server/service-worker runtime)
and `posthog-js` is deliberately not used: it lazy-loads remote scripts for
surveys, session recording and the toolbar, which a sandboxed guest origin must
never do.
