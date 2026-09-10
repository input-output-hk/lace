/**
 * Mock of @lace-contract/i18n for the perf island. The real package's barrel
 * (index.ts → contract.ts) pulls @lace-contract/module and, through it, the
 * vendor crypto subtree whose @noble/* deps ship untranspiled ESM that Jest
 * cannot parse — none of which any measured component exercises at runtime.
 *
 * The only runtime bindings ui-toolkit components use are re-exports of
 * react-i18next (useTranslation; TFunction/TranslationKey are type-only and
 * erased), and setup.perf.ts already mocks react-i18next with the real
 * English copy — so delegating to it keeps t(key) rendering production
 * strings.
 */
module.exports = require('react-i18next');
