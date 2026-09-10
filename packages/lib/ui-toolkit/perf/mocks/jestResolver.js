/**
 * Chained Jest resolver: react-native-worklets' official trick (drop the
 * `.native` extensions so its Jest mock runtime resolves instead of the
 * TurboModule bindings) layered on top of jest-expo's resolver (which itself
 * wraps @react-native/jest-preset's exports handling).
 */
const expoResolver = require('jest-expo/jest-preset').resolver
  ? require(require('jest-expo/jest-preset').resolver)
  : undefined;

module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter(
        extension => !extension.includes('native'),
      ),
    };
  }
  return expoResolver
    ? expoResolver(request, options)
    : options.defaultResolver(request, options);
};
