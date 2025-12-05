/* eslint-disable unicorn/prefer-module */
/**
 * Generate pieces of jest config to force ESM format transform
 * @param excpetionModules: string[]
 * @returns {{transform: {[p: string]: [string,{plugins: [string]}]}, transformIgnorePatterns: string[]}}
 */
const jestEsmExceptions = (excpetionModules) => {
  const esmExceptions = excpetionModules.join('|');
  const transformEntry = {
    [`node_modules/(${esmExceptions})/.*\\.m?js$`]: [
      'babel-jest',
      { plugins: ['@babel/plugin-transform-modules-commonjs'] }
    ]
  };
  const transformIgnorePatternsEntry = [`/node_modules/(?!(${esmExceptions})/)`];
  return {
    transform: transformEntry,
    transformIgnorePatterns: transformIgnorePatternsEntry
  };
};
module.exports = { jestEsmExceptions };
