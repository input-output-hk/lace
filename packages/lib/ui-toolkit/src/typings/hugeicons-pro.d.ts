// The hugeicons-pro packs declare only their barrel (`dist/types/index.d.ts`),
// so the per-icon `dist/esm/` modules IconMap.ts imports are untyped. Mirrors
// the packs' own `IconSvgObject`.
declare module '@hugeicons-pro/core-solid-rounded/dist/esm/*' {
  const icon: readonly (readonly [
    string,
    { readonly [attribute: string]: number | string },
  ])[];
  export default icon;
}

declare module '@hugeicons-pro/core-stroke-rounded/dist/esm/*' {
  const icon: readonly (readonly [
    string,
    { readonly [attribute: string]: number | string },
  ])[];
  export default icon;
}
