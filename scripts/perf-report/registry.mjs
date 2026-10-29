/**
 * Single home for the identities collect.mjs and render.mjs must agree on.
 * The same app carries two names — its Sentry project and its BrowserStack
 * prefix — resolved here once instead of by position in scattered literals;
 * adding a third app means adding one entry, not editing ~8 call sites.
 */

export const SCHEMA_VERSION = 1;

export const SENTRY_PROJECTS = {
  'lace-next': 4_511_780_014_260_224,
  'lace-v2-mobile': 4_509_327_135_473_664,
  'lace-extension-v2': 4_510_227_715_457_024,
};

/** The two mobile generations the nightly measures and compares. */
export const NEXT = { sentry: 'lace-next', bs: 'lace-next' };
export const V2 = { sentry: 'lace-v2-mobile', bs: 'lace' };
export const MOBILE_APPS = [NEXT, V2];

export const OS_NAMES = ['Android', 'iOS'];
export const BS_PLATFORMS = ['android', 'ios'];
