import { bold, cyan, yellow } from 'chalk';
import chokidar, { FSWatcher } from 'chokidar';
import execa, { ExecaChildProcess } from 'execa';
import fsExtra from 'fs-extra';
import ora from 'ora';
import path from 'path';
import { mergeDeepRight } from 'ramda';
import { cleanups } from './cleanup';
import { Package, resolvePackage } from './package';
import { Project, resolveProject } from './project';
import { markAsLinked } from './state';

export async function link(packagePaths: string[], cwd: string) {
  let firstInstallation = true;
  let currentInstallation: Installation | null = null;

  console.clear();
  const project = resolveProject(cwd);

  cleanups.add(() => fsExtra.remove(project.cachePath));

  const packages = packagePaths.map(resolvePackage);
  const syncer = createSyncer(packages, project);

  await ensureDependencyOn(packages, project);

  const specsToWatch = packages.map(pkg => pkg.spec.path);
  chokidar.watch(specsToWatch).on('change', installAndSync);

  installAndSync();

  async function installAndSync() {
    if (currentInstallation == null) {
      syncer.stop();
      if (firstInstallation === false) console.clear();
      firstInstallation = false;
      currentInstallation = installPackages(packages, project);
      const result = await currentInstallation.result;
      if (result === 'success') {
        syncer.start();
      }
      currentInstallation = null;
    } else {
      await currentInstallation.cancel();
      currentInstallation = null;
      installAndSync();
    }
  }
}

async function ensureDependencyOn(packages: Package[], project: Project) {
  const spinner = ora({ text: cyan('Checking project dependencies') }).start();

  try {
    await Promise.all(
      packages.map(({ name }) =>
        execa('yarn', ['why', name], { cwd: project.root }).then(({ stderr }) => {
          if (stderr != null && stderr !== '') {
            throw Error(
              yellow(`${bold(name)} is not a project's dependency!\n`) +
                `Please add this package as dependency and run ${bold('yarn install')}.`
            );
          }
        })
      )
    );
  } catch (e) {
    spinner.fail(e.message);
    process.exit(1);
  }

  spinner.succeed();
}

function installPackages(packages: Package[], project: Project): Installation {
  let childProcess: ExecaChildProcess;
  const spinner = ora({ text: cyan('Installing transitive dependencies') }).start();

  return {
    result: run(),
    cancel: async () => {
      childProcess.cancel();
      await childProcess.catch(() => null);
    }
  };

  async function run(): Promise<InstallationResult> {
    const originalProjectSpec = project.spec.get();
    const cleanup = () => project.spec.set(originalProjectSpec);
    cleanups.add(cleanup);

    try {
      const resolutions = copyPackagesToCache(packages, project);

      const updatedProjectSpec = mergeDeepRight(originalProjectSpec, { resolutions });
      project.spec.set(updatedProjectSpec);

      childProcess = execa('yarn', ['install', '--force', '--pure-lockfile', '--non-interactive']);
      await childProcess;

      cleanups.delete(cleanup);
      cleanup();
      spinner.succeed();
      return 'success';
    } catch (e) {
      cleanups.delete(cleanup);
      cleanup();

      if (e.isCanceled) {
        spinner.fail('Installation aborted due to change in package manifest.');
        return 'canceled';
      }

      spinner.fail('Installation failed with the following error:');
      console.error(e.message);
      console.log(
        yellow.inverse(
          "Process will try to reinstall transitive dependencies on next change in linked package's manifest."
        )
      );

      return 'error';
    }
  }
}

interface Installation {
  cancel(): Promise<void>;
  readonly result: Promise<InstallationResult>;
}

type InstallationResult = 'success' | 'canceled' | 'error';

function createSyncer(packages: Package[], project: Project) {
  let watchers: FSWatcher[] = [];

  return {
    start() {
      if (watchers.length > 0) return;

      watchers = packages.map(pkg =>
        chokidar
          .watch(pkg.root, { ignored: toWatchIgnoredPaths(pkg) })
          .on('all', (event, eventPath) => {
            if (eventPath === pkg.root) return;

            const relativeEventPath = path.relative(pkg.root, eventPath);
            const target = `${project.root}/node_modules/${pkg.name}/${relativeEventPath}`;

            switch (event) {
              case 'add':
              case 'change':
                fsExtra.copy(eventPath, target).catch(console.error);
                return;
              case 'addDir':
                fsExtra.ensureDir(target).catch(console.error);
                return;
              case 'unlink':
              case 'unlinkDir':
                fsExtra.remove(target).catch(console.error);
                return;
              default:
                throw Error('Unexpected FS event!');
            }
          })
      );

      markAsLinked(packages, project);
      console.info('🚧  Keeping packages in sync...');
    },
    stop() {
      watchers.forEach(watcher => watcher.close());
      watchers = [];
      markAsLinked([], project);
    }
  };
}

function toWatchIgnoredPaths(pkg: Package) {
  // TODO: read .npmignore or .gitignore
  // TODO: read "files" property in package's spec
  // TODO: make sure you restart watchers when .ignore files change
  return [pkg.spec.path, '**/.git/**', '**/node_modules/**'];
}

function copyPackagesToCache(
  packages: Package[],
  project: Project
): { [packageName: string]: string } {
  fsExtra.removeSync(project.cachePath);

  const resolutions = packages.reduce(
    (result, pkg) => ({ ...result, [pkg.name]: `${project.cachePath}/${pkg.name}` }),
    {}
  );

  // todo: copy only non-ignored files & package.json
  packages.forEach(pkg => {
    fsExtra.copySync(pkg.root, resolutions[pkg.name], {
      filter: (src, des) => !src.includes('/node_modules') && !src.includes('/.git')
    });
  });

  return resolutions;
}
