#!/usr/bin/env node

import { bold, yellow } from 'chalk';
import program from 'commander';
import { cleanups } from './cleanup';
import { collectConfig, selectPackages } from './config';
import { link } from './link';

const { version } = require(`${__dirname}/../../package.json`); // eslint-disable-line @typescript-eslint/no-require-imports

program.version(version).description('Links a local package into your project.');

program
  .name('link-with')
  .description('Link local packages into current project.')
  .option('-c, --config', 'Configure linker.')
  .action(async cmd => {
    if (cmd.config) {
      collectConfig();
    } else {
      registerExitHandlers();
      try {
        const packagePaths = await selectPackages();
        await link(packagePaths, process.cwd());
      } catch (e) {
        console.error(e);
        process.exit(1);
      }
    }
  });

program.parse(process.argv);

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
