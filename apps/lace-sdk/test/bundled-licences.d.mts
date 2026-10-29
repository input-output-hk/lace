export const PERMISSIVE: Set<string>;
export const inlinedPackageDirectories: (code: string) => Map<string, string>;
export const isPermissive: (expression: unknown) => boolean;
export const licenceOf: (manifest: {
  license?: string | { type?: string };
}) => string | undefined;
export const licenceViolations: (
  distributionDirectory: string,
  root: string,
) => { count: number; violations: string[] };
