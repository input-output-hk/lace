const rootDir = process.cwd();
module.exports = {
  preset: 'ts-jest',
  rootDir: process.cwd(),
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        diagnostics: false,
        tsconfig: `${rootDir}/src/tsconfig.json`,
      },
    ],
  },
};
