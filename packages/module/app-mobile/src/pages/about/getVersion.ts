import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';

export const getVersion = (): string => {
  return `${String(nativeApplicationVersion ?? '0')}.${String(
    nativeBuildVersion ?? '0',
  )}`;
};
