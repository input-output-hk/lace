exports.laceEslintConfigPath = require.resolve('./.eslintrc.js');

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('node:fs').existsSync(exports.laceEslintConfigPath);
