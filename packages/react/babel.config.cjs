// @ts-check

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: [
    ['@babel/preset-env', { modules: false }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  ignore: [
    '**/__stories__/**',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/__fixtures__/**',
    '**/*.stories.*',
    '**/*.test.*',
    '**/*.spec.*',
  ],
};