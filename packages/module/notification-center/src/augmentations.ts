export {};

declare module '@lace-contract/module' {
  interface SideEffectDependencies {
    notificationCenter: { unused: () => Promise<string> };
  }
}
