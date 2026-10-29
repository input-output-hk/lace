// The React components that render the app's views from its view addons. The
// stable SDK build resolves view-renderers.stable.ts instead: the SDK runs
// headless and loads no view addon.
// Keep the two files' exports in step, apart from the names the variant
// declares on stable-omits lines; the SDK's stable variant parity check
// enforces it.
export * from './lace-render-root';
export * from './lace-view';
