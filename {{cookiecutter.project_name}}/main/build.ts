import { build, BuildOptions } from 'esbuild';
import * as child_process from 'child_process';
import treeKill from 'tree-kill';
import * as path from 'path';

const sourceDir = path.join(__dirname, './src');
const distDir = path.join(__dirname, '../dist');
const electronPath = path.join(__dirname, './node_modules/.bin/electron');
const electronArgs = `${distDir}/dev/main.js`;

const commonConfig: BuildOptions = {
  entryPoints: [`${sourceDir}/main.ts`, `${sourceDir}/preload.ts`],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  external: ['node', 'electron']
};

const option = process.argv[2];
if (option === 'build') {
  buildProd();
} else if (option === 'electron') {
  watchElectron();
} else {
  console.error('Option is not specified');
}

async function buildProd() {
  await build({
    ...commonConfig,
    minify: true,
    outdir: `${distDir}/prod`
  });
}

let electronProcess: child_process.ChildProcess | null = null;
async function watchElectron() {
  await build({
    ...commonConfig,
    sourcemap: true,
    outdir: `${distDir}/dev`,
    define: {
      'process.env.isDev': 'true'
    },
    watch: {
      onRebuild(error) {
        if (error) console.error('watch build failed:', error);
        else {
          console.log('build success! Restarting...');
          if (electronProcess) {
            const pid = electronProcess.pid;
            if (pid) {
              treeKill(pid);
            }
            electronProcess = child_process.exec(`${electronPath} ${electronArgs}`);
          }
        }
      }
    }
  });
  electronProcess = child_process.exec(`${electronPath} ${electronArgs}`);
}

process.on('exit', function () {
  if (electronProcess) {
    electronProcess.kill();
  }
});
process.on('SIGINT', function () {
  process.exit(0);
});
