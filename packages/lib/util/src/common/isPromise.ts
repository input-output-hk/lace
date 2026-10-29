export const isPromise = <T>(obj: Promise<T> | T): obj is Promise<T> =>
  typeof obj === 'object' && typeof (obj as any).then === 'function';
