module.exports = {
  presets: [
    [
      '@babel/preset-typescript',
      {
        tsconfig: './tsconfig.json'
      }
    ],
    '@babel/preset-react'
  ],
  plugins: ['@babel/plugin-transform-modules-commonjs']
};
