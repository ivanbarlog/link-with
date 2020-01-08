#!/usr/bin/env node

import { bold, yellow } from 'chalk';
import program from 'commander';
import path from 'path';
import { cleanups } from './cleanup';
import { link } from './link';

const { version } = require(`${__dirname}/../../package.json`); // eslint-disable-line @typescript-eslint/no-require-imports

program.version(version).description('Links a local package into your project.');

program
  .name('link-with')
  .arguments('<packagePath> [otherPackagePaths...]')
  .usage('<packagePath> [otherPackagePaths...]')
  .description('Links the given packages into project.')
  .action(async (packagePath, otherPackagePaths, cmd) => {
    registerExitHandlers();
    try {
      const cwd = process.cwd();
      const packagePaths = [packagePath, ...otherPackagePaths].map(packagePath => {
        if (path.isAbsolute(packagePath)) return packagePath;
        return path.resolve(`${cwd}/${packagePath}`);
      });

      await link(packagePaths, process.cwd());
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });

program.parse(process.argv);
if (program.args.length === 0) program.outputHelp();

function registerExitHandlers() {
  const cleanup = async () => {
    await Promise.all([...cleanups].map(fn => fn()));
    console.warn(
      yellow.inverse(
        `\n To properly revert any changes, ${bold('yarn install --force')} may be necessary! `
      )
    );
    process.exit();
  };
  process.on('SIGINT', cleanup);
  process.on('SIGUSR1', cleanup);
  process.on('SIGUSR2', cleanup);
  process.on('uncaughtException', e => {
    console.error('UNCAUGHT EXCEPTION!');
    console.error(e);
    return cleanup;
  });
  process.on('unhandledRejection', e => {
    console.error('UNHANDLED REJECTION!');
    console.error(e);
    return cleanup;
  });
}
