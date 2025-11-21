if (process.env.NAMI_EXTENSION_ID === undefined) {
  throw new Error('process.env.NAMI_EXTENSION_ID must be defined');
}
export const NAMI_EXTENSION_ID = process.env.NAMI_EXTENSION_ID;
