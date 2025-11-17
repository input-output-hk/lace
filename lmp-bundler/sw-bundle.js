// Service worker bundle
// SW scripts have to be imported synchronously (or very fast, if async)

// Flag to identify if this is a LMP bundle
globalThis.LMP_BUNDLE = true

// v1
importScripts("/sw/background.js");
// LMP
importScripts("/js/sw/sw-script.js");
