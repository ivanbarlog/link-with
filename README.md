<h1 align="center">🔗 LINK-WITH</h1>

<h3 align="center">The link you always needed!</h3>

<p align="center"><strong>⚠️ WORKS ONLY WITH YARN ⚠️</strong></p>

## Why

Unfortunately, build-in `link` command in `npm` and `yarn (v1)` will link your package without
installing the transitive dependencies.

This tool will properly install the _linked_ package with all its dependencies and sync any future changes while it runs.

Any changes to `package.json` in linked package will cause the reinstall,
so your project will always be in sync.

## Installation

```
$ yarn global add link-with
```

## Usage

Just run `link-with` in your project and select the packages, which you want to link.

> Linker needs to be configured first by running `link-with -c`

## How it works

Tool is watching `package.json` file in every linked package. On a start or when a change is detected, the following will happen:

1. Copy package's source into temporary folder. Omit any node_modules and git directories.
2. Add/update `resolutions` property in project's `package.json` to point to temporary folder.
3. Run `yarn install` (will remove temporary folder).
4. Revert project's `package.json`.
5. Watch & sync package's files.

This process makes sure that you always have all necessary dependencies and changes in place.

## Integration with dev tools

Unfortunately, not all build tools are aware that files in _node_modules_ could change.
You can quite often find that _node_modules_ are excluded from watch process to save a limited system resources.

As we are not able to detect this, you need to make sure that your build tool is watching
the linked packages.

To know which packages are linked right now, you can use a `getLinkedPackages` function which will return the list of packages and their paths:

```js
import { getLinkedPackages } from 'link-with';

/**
 * RESULT:
 *   [
 *     { name: 'my-dependency', root: '/Users/deftomat/dev/my-dependency' }
 *   ]
 */
const linked = getLinkedPackages();
```

You can easily use this helper function in your webpack config to know which packages must be included in watch process.

### TypeScript tip

As a linked packages will probably contains JavaScript files compiled from TypeScript, your build tool will watch JS files for changes. The problem arise when you change the type definition in a linked package without changing the code itself. As you probably figured out, the TypeScript compiler will ignore this change because from its point of view, nothing changed.

To fix this issue, we recommend to **always** emit source maps together with JavaScript code to let TypeScript compiler know that something changed.

## Current limitations

- We only support `yarn` as this tool is using _resolutions_ property in `package.json`.
- When a linked package's name change, the tool must be restarted.
- Package which will be linked must be specified in dependencies.
  This limitation provides us a way how to support monorepos as we don't know which package in your monorepo should depends on linked package. If you need to link a completely new package, then add it into `package.json` as `file:/path/to/package` dependency first.
