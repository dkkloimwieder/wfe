# Epic 5c close report: install cost of the prepare builds

Epic wfe-w2y.45 is complete. Main is fast-forwarded to the commit that adds this report. The last `pnpm check` passed with 120 test files and 1139 tests.

The commits are:

- b12fb43: issue .1, the shared prepare script and its tests

## The three install times

A fresh consumer workspace in `/dev/shm` listed `web/wfe/packages/*`. Its root depended on the five `@wfe` packages through `workspace:*`. `web/wfe` was a copy of the tracked files at b12fb43, with no `node_modules` and no `dist`. Each install ran once with `pnpm install --prefer-offline`. The load average is the 1, 5 and 15 minute value directly before each install.

| Install                         | Wall time | Load average       | Prepare                         |
| ------------------------------- | --------: | ------------------ | ------------------------------- |
| Cold                            |   13.93 s | 2.92 / 6.87 / 8.88 | All five ran and built.         |
| Repeat, nothing changed         |    0.07 s | 3.39 / 6.73 / 8.79 | None ran.                       |
| Repeat, one source file changed |    0.07 s | 3.01 / 6.48 / 8.68 | None ran. Form did not rebuild. |

In the cold install, the five prepare builds took these times. They overlap, because pnpm runs independent packages at the same time.

| Package    | Prepare time |
| ---------- | -----------: |
| form       |        2.9 s |
| sync       |        4.5 s |
| components |       10.6 s |
| generator  |        2.7 s |
| shell      |        2.4 s |

## Findings

1. A repeat install with nothing changed runs no prepare at all. pnpm finds the install up to date and stops. So the skip matters only when pnpm does run prepare.
2. A repeat install after a source change also runs no prepare. pnpm does not look at the source of a workspace package. So after a source change, for example a new wfe submodule commit, the consumer keeps the old `dist`. The consumer must run the package build, or an install that runs prepare, to get a new `dist`.
3. When pnpm runs prepare, the skip works. Two extra installs removed only `node_modules` and kept every `dist` and hash file. With no source change, the install took 0.52 s, and all five packages skipped their builds. With the one form change, the install took 3.06 s. Form and generator rebuilt, because generator depends on form. Components, shell and sync skipped.

## How the skip works

Each package's `prepare` runs `node ../../scripts/prepare-package.mjs`. The script makes a SHA-256 hash of these inputs:

- the path and bytes of each file under `src`
- the tsdown configuration file
- `package.json`
- the `.tsdown-hash` file of each `@wfe` package in the dependency lists

The script runs tsdown only when `dist` is missing, the hash file is missing, or the hash differs. It writes `.tsdown-hash` beside `dist`, because tsdown empties `dist` on each build. It writes the hash only after tsdown exits 0. `"build": "tsdown"` still always builds.

Generator lists components and form, and shell lists components. So a components change rebuilds components, generator and shell.

`tests/tooling/prepare-package.test.mjs` uses a fake tsdown. It covers these cases:

- an unchanged hash skips the build
- a changed source file rebuilds
- a deleted `dist` rebuilds
- a new source file rebuilds
- a failed build leaves no hash
- a dependency hash that changed, did not change, or is missing

## Deviations

1. The owner added the dependency rule after the first version. A package that compiles against another package's `dist` also hashes that package's hash file.
2. The first measurement used `--offline` and stopped. The consumer has no lockfile, so pnpm resolved newer versions than the wfe lockfile. The store lacked `@babel/types@7.29.11`. The measurement then used `--prefer-offline`. The cold install downloaded nine tarballs: `baseline-browser-mapping@2.11.32`, `browserslist@4.29.4`, `node-releases@2.0.60`, `@babel/helper-string-parser@7.29.11`, `postcss@8.5.31`, `electron-to-chromium@1.5.464`, `@babel/types@7.29.11`, `caniuse-lite@1.0.30001819` and `@babel/parser@7.29.11`. The later installs downloaded none.
3. An explicit `build` does not write the hash file. If a developer changes the source, runs `build`, and then restores the source, the next prepare can skip with a `dist` built from the changed source.
4. Each time is a single measurement on a shared host, so the times are rough.
