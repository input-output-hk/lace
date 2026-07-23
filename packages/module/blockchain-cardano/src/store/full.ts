import { inferStoreContext } from '@lace-contract/module';

// Full store for the extension/mobile module entry (`index.ts`). Loads
// `./init-full`, which adds the tx-executor-coupled cNIGHT confirm/submit
// side-effects on top of the SDK-safe `./init`. The headless SDK entry
// (`sdk.ts`) deliberately uses the leaner `./store` (→ `./init`) instead,
// keeping `@lace-contract/tx-executor` (→ authentication-prompt →
// react-i18next) out of the SDK bundle (ADR 30).
export default inferStoreContext({
  load: async () => import('./init-full'),
  context: {
    actions: {},
    selectors: {},
  },
});
