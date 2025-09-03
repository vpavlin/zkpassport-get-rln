// build-zkpassport.js
const esbuild = require('esbuild');
const fs = require('fs');

esbuild.build({
  entryPoints: ['node_modules/@zkpassport/sdk/dist/esm/index.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  globalName: 'ZKPassportSDK',
  outfile: 'zkpassport.umd.js',
  // CRITICAL: DO NOT mark internal deps as external
  external: [], 
  // Handle JSON imports properly
  loader: {
    '.json': 'json'
  },
  // Transform dynamic imports to work in IIFE
  banner: {
    js: `
      var __dynamic_import__ = (url) => {
        return import(url).catch(e => {
          console.error('Dynamic import failed:', e);
          throw e;
        });
      };
      var __require = (id) => {
        console.warn('CommonJS require() not supported in browser', id);
        return null;
      };
    `
  }
}).catch(() => process.exit(1));