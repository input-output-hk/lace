/**
 * Which third-party packages reach what the SDK's family ships, and whether
 * their resolved versions differ between two commits. A change to the root
 * lockfile or a manifest counts only through these: a lockfile change that
 * resolves the packages the builds bundle, or the packages publish
 * dependencies on, to the same entries as before ships nothing.
 *
 * The packages are found from the code: the third-party modules the source
 * the builds reach imports, the dependencies, peers and development
 * dependencies the family's own manifests declare (the published
 * dependencies, and the build tools that make the output), and the tools the
 * family's build targets run from the root install: the commands their build
 * scripts invoke, mapped to the packages whose `bin` provides them, and the
 * modules the scripts they run with node and their tools' configuration
 * import. Each is resolved
 * in the lockfile as npm resolves it, from the importing package's directory
 * up, and closed over the dependencies of every entry reached, less the
 * peers it marks optional: npm never installs those for it, so they reach
 * the family only where something else depends on them. A root
 * override counts when it names one of those packages.
 */
import ts from 'typescript';

/** The parts of a lockfile entry that decide what installs. */
interface LockEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

export interface Lockfile {
  packages: Record<string, LockEntry>;
}

/** A package to resolve: its name, and the directory whose code needs it. */
export interface Seed {
  from: string;
  name: string;
}

/** The package a bare module specifier names, or undefined for anything else. */
export const packageOfSpecifier = (specifier: string): string | undefined => {
  if (/^(\.|\/|node:|[a-z]+:\/\/)/.test(specifier)) return undefined;
  const parts = specifier.split('/');
  const name = specifier.startsWith('@')
    ? parts.slice(0, 2).join('/')
    : parts[0];
  return name && /^(@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/i.test(name)
    ? name
    : undefined;
};

/** The bare module specifiers a source file imports or re-exports. */
export const importsOf = (source: string): string[] =>
  ts
    .preProcessFile(source, true, true)
    .importedFiles.map(({ fileName }) => fileName);

/** The directory a lockfile path resolves dependencies from, one level up. */
const parentOf = (from: string): string | undefined => {
  if (from === '') return undefined;
  // A nested install resolves from the package that holds it; a top-level
  // package or a workspace directory, from the root.
  const nested = /^(.*)\/node_modules\/(?:@[^/]+\/)?[^/]+$/.exec(from);
  return nested ? nested[1] : '';
};

/** The lockfile path `name` resolves to from `from`, as npm resolves it. */
export const resolveIn = (
  lock: Lockfile,
  from: string,
  name: string,
): string | undefined => {
  for (
    let directory: string | undefined = from;
    directory !== undefined;
    directory = parentOf(directory)
  ) {
    const candidate = `${directory ? `${directory}/` : ''}node_modules/${name}`;
    if (lock.packages[candidate]) return candidate;
  }
  return undefined;
};

const FIELDS = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

/**
 * Every lockfile entry `seeds` reach, closed over each entry's dependencies,
 * as path → what installs there, with the root overrides that name a package
 * reached. A workspace link is the workspace's own code, which the source
 * scope covers, so it is not followed.
 */
export const lockSignature = (
  lock: Lockfile,
  seeds: Iterable<Seed>,
  overrides: Record<string, unknown> = {},
): Map<string, string> => {
  const signature = new Map<string, string>();
  const names = new Set<string>();
  const queue = [...seeds].map(({ from, name }) => ({ from, name }));
  while (queue.length > 0) {
    const { from, name } = queue.shift() as Seed;
    const resolved = resolveIn(lock, from, name);
    if (!resolved || signature.has(resolved)) continue;
    const entry = lock.packages[resolved] ?? {};
    if (entry.link) continue;
    names.add(name);
    signature.set(
      resolved,
      JSON.stringify([
        entry.version,
        entry.resolved,
        entry.integrity,
        ...FIELDS.map(field => entry[field] ?? {}),
      ]),
    );
    for (const field of FIELDS) {
      for (const dependency of Object.keys(entry[field] ?? {})) {
        // An optional peer, such as the react-native a browser library
        // supports, installs only for a package that depends on it.
        if (
          field === 'peerDependencies' &&
          entry.peerDependenciesMeta?.[dependency]?.optional
        ) {
          continue;
        }
        queue.push({ from: resolved, name: dependency });
      }
    }
  }
  for (const [key, value] of Object.entries(overrides)) {
    const name = key.replace(/(.)@.*$/, '$1');
    if (names.has(name)) {
      signature.set(`overrides:${key}`, JSON.stringify(value));
    }
  }
  return signature;
};

/** The entries that differ between two signatures, sorted. */
export const signatureChanges = (
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): string[] =>
  [...new Set([...before.keys(), ...after.keys()])]
    .filter(key => before.get(key) !== after.get(key))
    .sort();

/**
 * The fields of a workspace package's manifest that decide how a bundler
 * resolves and includes it. A workspace package is linked rather than
 * locked, so lockSignature never sees them.
 */
export const MANIFEST_BUILD_FIELDS: readonly string[] = [
  'exports',
  'imports',
  'main',
  'module',
  'types',
  'typings',
  'type',
  'browser',
  'sideEffects',
];

/**
 * The build fields that differ between two versions of a workspace package's
 * manifest. Values compare as written, key order included, since conditions
 * in `exports` match in order. A missing manifest has no fields.
 */
export const manifestBuildChanges = (
  before: Readonly<Record<string, unknown>> | undefined,
  after: Readonly<Record<string, unknown>> | undefined,
): string[] =>
  MANIFEST_BUILD_FIELDS.filter(
    field => JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field]),
  );

/** The parts of a build script's commands that name what it runs. */
export interface BuildCommands {
  /**
   * Commands run by name (`tsc`, `npx tsdown`, `npm exec rollup`,
   * `node_modules/.bin/tsc`): binaries of the install.
   */
  binaries: string[];
  /** Packages named outright (`npx -p typescript tsc`). */
  packages: string[];
  /** Scripts run with node, by their path as written. */
  scripts: string[];
  /** Shell scripts run (`bash x.sh`, `sh x.sh`, `./x.sh`), by their path. */
  shellScripts: string[];
  /** Configuration files passed to a command (`-c x`, `--config x`). */
  configs: string[];
}

/** Programs that run the command after them: `env FOO=1 tsc`, `time tsc`. */
const WRAPPERS = new Set(['env', 'exec', 'time', 'command', 'nice', 'nohup']);
const SHELLS = new Set(['bash', 'sh', 'zsh']);
/** npx and npm exec options that take a value. */
const PACKAGE_OPTIONS = new Set(['-p', '--package']);
const VALUE_OPTIONS = new Set([
  ...PACKAGE_OPTIONS,
  '-c',
  '--call',
  '-w',
  '--workspace',
]);

/**
 * The program `npx` or `npm exec` runs from `words` (its arguments), and the
 * packages its `-p`/`--package` options name.
 */
const execTarget = (
  words: readonly string[],
): { binary?: string; packages: string[] } => {
  const packages: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? '';
    if (word === '--') return { binary: words[index + 1], packages };
    const [option, inline] = word.split(/=(.*)/s);
    if (PACKAGE_OPTIONS.has(option ?? '')) {
      const value = inline ?? words[(index += 1)];
      const name = value?.replace(/(.)@[^@]*$/, '$1');
      if (name) packages.push(name);
      continue;
    }
    if (VALUE_OPTIONS.has(word)) {
      index += 1;
      continue;
    }
    if (word.startsWith('-')) continue;
    return { binary: word, packages };
  }
  return { packages };
};

/**
 * What a shell build script runs: each command's program, through the
 * wrappers that run another (`env`, `exec`, `time`), the program of `npx`
 * and of `npm exec` and `-p` packages, a binary run by its `node_modules/.bin`
 * path, the scripts `node` runs and the shell scripts it runs. Comments,
 * variable assignments and shell words are skipped; a binary the install does
 * not provide resolves to no package (binaryOwners), so a builtin such as
 * `cd` adds nothing.
 */
export const buildCommands = (script: string): BuildCommands => {
  const binaries = new Set<string>();
  const packages = new Set<string>();
  const scripts = new Set<string>();
  const shellScripts = new Set<string>();
  const configs = new Set<string>();
  for (const raw of script.split('\n')) {
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) continue;
    for (const segment of line.split(/&&|\|\||;|\||\$\(|\(|\)|`/)) {
      let words = segment
        .trim()
        .split(/\s+/)
        .filter(word => word && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word));
      while (words[0] && WRAPPERS.has(words[0])) {
        words = words
          .slice(1)
          .filter(word => !word.startsWith('-') || !/^-[a-zA-Z]$/.test(word));
      }
      const [program, ...rest] = words;
      if (!program) continue;
      rest.forEach((word, index) => {
        const inline = /^--config=(.+)$/.exec(word)?.[1];
        const given =
          inline ??
          (/^(?:-c|--config)$/.test(word) ? rest[index + 1] : undefined);
        if (given && !given.startsWith('-')) configs.add(given);
      });
      const target = rest.find(word => !word.startsWith('-'));
      if (
        program === 'npx' ||
        (program === 'npm' && /^(exec|x)$/.test(rest[0] ?? ''))
      ) {
        const run = execTarget(program === 'npx' ? rest : rest.slice(1));
        if (run.binary) binaries.add(run.binary);
        for (const name of run.packages) packages.add(name);
      } else if (program === 'node') {
        if (target && /\.[cm]?[jt]s$/.test(target)) scripts.add(target);
      } else if (SHELLS.has(program)) {
        if (target) shellScripts.add(target);
      } else if (/(^|\/)node_modules\/\.bin\/[^/]+$/.test(program)) {
        binaries.add(program.replace(/^.*\//, ''));
      } else if (/^\.{1,2}\//.test(program)) {
        if (/\.(?:sh|bash)$/.test(program)) shellScripts.add(program);
        else if (/\.[cm]?[jt]s$/.test(program)) scripts.add(program);
      } else if (/^[a-z][\w.-]*$/i.test(program)) {
        binaries.add(program);
      }
    }
  }
  return {
    binaries: [...binaries].sort(),
    packages: [...packages].sort(),
    scripts: [...scripts].sort(),
    shellScripts: [...shellScripts].sort(),
    configs: [...configs].sort(),
  };
};

/** The top-level package of the lockfile that provides each binary. */
export const binaryOwners = (lock: Lockfile): Map<string, string> => {
  const owners = new Map<string, string>();
  for (const [key, entry] of Object.entries(lock.packages)) {
    const name = /^node_modules\/((?:@[^/]+\/)?[^/]+)$/.exec(key)?.[1];
    const bin = (entry as { bin?: Record<string, string> | string }).bin;
    if (!name || !bin) continue;
    for (const binary of typeof bin === 'string'
      ? [name.replace(/^@[^/]+\//, '')]
      : Object.keys(bin)) {
      if (!owners.has(binary)) owners.set(binary, name);
    }
  }
  return owners;
};

/** A family app's build target, as its project.json declares it. */
export interface BuildTarget {
  app: string;
  /** The commands the target runs, in order. */
  commands: string[];
  /** The directory they run in, repository-relative. */
  cwd: string;
}

export interface ProjectJson {
  targets?: {
    build?: {
      options?: {
        command?: string;
        commands?: (string | { command?: string })[];
        cwd?: string;
      };
    };
  };
}

/**
 * The build target of `app` from its project.json: `options.command` or
 * `options.commands`. Throws when it declares none, since a target whose
 * commands cannot be read cannot say which tools make the output.
 */
export const buildTargetOf = (
  app: string,
  project: ProjectJson,
): BuildTarget => {
  const options = project.targets?.build?.options ?? {};
  const commands = [
    ...(options.command ? [options.command] : []),
    ...(options.commands ?? []).map(entry =>
      typeof entry === 'string' ? entry : entry.command ?? '',
    ),
  ].filter(Boolean);
  if (commands.length === 0) {
    throw new Error(
      `${app}/project.json's build target runs no command (options.command or options.commands) the release scope can read`,
    );
  }
  return { app, commands, cwd: options.cwd ?? app };
};

/**
 * The third-party packages a family build target runs from the root install,
 * as seeds: the packages whose binaries its commands and shell scripts
 * invoke, the packages they name outright, and the modules imported by the
 * scripts they run with node (and the files those import) and by the app's
 * tool configuration (`configs`). `read` returns a repository-relative file's
 * text, or undefined when there is none. Throws, rather than leave a tool out,
 * when a script it runs is missing, or when nothing it runs resolves to a
 * package of the lockfile.
 */
export const buildTargetSeeds = ({
  target,
  read,
  configs,
  owners,
  hasPackage,
}: {
  target: BuildTarget;
  read: (file: string) => string | undefined;
  configs: readonly string[];
  owners: ReadonlyMap<string, string>;
  hasPackage: (name: string) => boolean;
}): Seed[] => {
  const { app } = target;
  const seeds: Seed[] = [];
  const tools = new Set<string>();
  const join = (...parts: string[]) =>
    parts
      .join('/')
      .split('/')
      .reduce<string[]>((path, part) => {
        if (part === '..') path.pop();
        else if (part && part !== '.') path.push(part);
        return path;
      }, [])
      .join('/');
  /** A script the target runs: from the command's directory, or the app's. */
  const locate = (file: string, from: string): string => {
    for (const candidate of [join(from, file), join(app, file)]) {
      if (read(candidate) !== undefined) return candidate;
    }
    throw new Error(
      `${app}'s build target runs ${file}, which does not exist (looked in ${from} and ${app})`,
    );
  };
  const seen = new Set<string>();
  const importsFrom = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = read(file);
    if (source === undefined) return;
    for (const specifier of importsOf(source)) {
      if (specifier.startsWith('.')) {
        importsFrom(join(file, '..', specifier));
        continue;
      }
      const name = packageOfSpecifier(specifier);
      if (name) seeds.push({ from: app, name });
    }
  };
  const invoked = new Set<string>();
  const passedConfigs = new Set<string>();
  const run = (text: string, from: string) => {
    const commands = buildCommands(text);
    for (const config of commands.configs) passedConfigs.add(config);
    for (const binary of commands.binaries) {
      invoked.add(binary);
      const owner = owners.get(binary);
      if (owner) {
        tools.add(owner);
        seeds.push({ from: '', name: owner });
      }
    }
    for (const name of commands.packages) {
      if (hasPackage(name)) tools.add(name);
      seeds.push({ from: '', name });
    }
    for (const script of commands.scripts) importsFrom(locate(script, from));
    for (const script of commands.shellScripts) {
      const file = locate(script, from);
      if (seen.has(file)) continue;
      seen.add(file);
      // A build script changes to its app's directory first, as these do.
      run(read(file) ?? '', app);
    }
  };
  for (const command of target.commands) run(command, target.cwd);
  // Only the configuration the build's own tools read: `<tool>.config.*` of
  // a tool it runs, or a file passed with -c/--config. A test runner's or a
  // linter's configuration (vitest, eslint) makes no output.
  const toolConfigs = configs.filter(config =>
    invoked.has(config.replace(/\.config\.[cm]?[jt]s$/, '')),
  );
  for (const config of new Set([...toolConfigs, ...passedConfigs])) {
    importsFrom(join(app, config.replace(/^\.\//, '')));
  }
  if (tools.size === 0) {
    throw new Error(
      `${app}'s build target runs no tool the lockfile provides; the release scope would miss a bump of the tools that make its output`,
    );
  }
  return seeds;
};
