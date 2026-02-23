module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@/src/hooks': './src/hooks',
            '@/src/services': './src/services',
            '@/src/types': './src/types',
            '@/src/screens': './src/screens',
            '@/src/components': './src/components',
            '@/src/utils': './src/utils',
            '@/hooks': './src/hooks',
            '@/services': './src/services',
            '@/types': './src/types',
            '@/screens': './src/screens',
            '@/components': './src/components',
            '@/constants': './constants',
            '@': './',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};
