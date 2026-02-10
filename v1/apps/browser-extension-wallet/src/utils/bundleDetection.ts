/* eslint-disable @typescript-eslint/no-explicit-any */
export const isV2Bundle = (): boolean => !(globalThis as any).LMP_BUNDLE;
