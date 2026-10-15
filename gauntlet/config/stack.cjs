// The one declaration the kit needs from a project: gauntlet.json at the project root,
//   {"project": "<name>", "service": "<name>", "stack": "<name>"}
// `stack` is mandatory. `project` and `service` are declared together or not at all: together
// when the repository has a dev container (the project is the folder that holds the sibling
// repositories, the service is this repository's role inside it — api, app, admin), neither
// when it has none. Read HERE and nowhere else, so every consumer (the dependency-cruiser
// selector, the vitest base, init --check) agrees. CommonJS on purpose: the root
// .dependency-cruiser.cjs is loaded with require(), and ESM consumers import CJS without
// ceremony. Fails loudly on a missing file, an unknown stack or a malformed name — there is no
// default: a gate whose rules depend on a guess is not a gate.

const {existsSync, readFileSync} = require('node:fs');
const {resolve} = require('node:path');

// Mirrored by KNOWN_STACKS in gauntlet/init.sh, which is bash and cannot import this file; init
// reads this line and fails when the two lists disagree, so keep the declaration on one line.
const KNOWN_STACKS = ['hex-api', 'nestjs', 'nextjs', 'vite-react', 'vite-vue'];
const KNOWN_KEYS = ['project', 'service', 'stack'];
// Project and service names end up in container paths, volume names and compose project
// names: lower-case letters, digits and dashes, starting with a letter.
const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
// gauntlet/config/stack.cjs → the project root is two levels up. The kit always sits at
// <project root>/gauntlet, so this never depends on the current working directory.
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const DECLARATION_FILE_PATH = resolve(PROJECT_ROOT, 'gauntlet.json');

const readDeclaration = () => {
  if (!existsSync(DECLARATION_FILE_PATH)) {
    throw new Error(
      'gauntlet.json not found at ' + DECLARATION_FILE_PATH +
      '. Run `bash gauntlet/init.sh` once per project.'
    );
  }

  const declaration = JSON.parse(readFileSync(DECLARATION_FILE_PATH, 'utf8'));
  const unknownKeys = Object.keys(declaration).filter((key) => !KNOWN_KEYS.includes(key));

  if (unknownKeys.length > 0) {
    throw new Error('gauntlet.json has unknown key(s) ' + unknownKeys.join(', ') + '. Known keys: ' + KNOWN_KEYS.join(', ') + '.');
  }

  if (!KNOWN_STACKS.includes(declaration.stack)) {
    throw new Error(
      'gauntlet.json declares unknown stack "' + String(declaration.stack) +
      '". Known stacks: ' + KNOWN_STACKS.join(', ') + '.'
    );
  }

  const hasProject = declaration.project !== undefined;
  const hasService = declaration.service !== undefined;

  if (hasProject !== hasService) {
    throw new Error('gauntlet.json must declare project and service together, or neither when the repository has no dev container.');
  }

  for (const nameKey of ['project', 'service']) {
    if (declaration[nameKey] !== undefined && !NAME_PATTERN.test(declaration[nameKey])) {
      throw new Error(
        'gauntlet.json: ' + nameKey + ' "' + String(declaration[nameKey]) +
        '" must be lower-case letters, digits and dashes, starting with a letter.'
      );
    }
  }

  return {
    project: hasProject ? declaration.project : null,
    service: hasService ? declaration.service : null,
    stack: declaration.stack
  };
};

const readStack = () => readDeclaration().stack;

module.exports = {KNOWN_STACKS, NAME_PATTERN, PROJECT_ROOT, readDeclaration, readStack};
