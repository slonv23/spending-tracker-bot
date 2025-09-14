import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  target: 'node22',
  sourcemap: false,
  external: ['@aws-sdk/*'],
  treeShaking: true,
  minify: true,
});
