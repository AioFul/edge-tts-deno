import * as esbuild from "npm:esbuild@0.20.2";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";


await esbuild.build({
  entryPoints: ["./worker.ts"],
  bundle: true,
  plugins: [
    {
      name: 'ws-alias',
      setup(build) {
        build.onResolve({ filter: /^ws$/ }, () => {
          return { path: new URL('./ws-polyfill.ts', import.meta.url).pathname };
        });
      },
    },
    ...denoPlugins(),
  ],
  outfile: "./dist/bundle.js",
  format: "esm",
  minify: true,
  platform: "neutral",
  external: ['utf-8-validate', 'bufferutil'],
  inject: ["./scripts/deno-polyfill.ts"],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

esbuild.stop();