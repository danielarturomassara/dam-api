// Single source of truth for the protected-path policy.
// Consumers: gauntlet/hook/claude/protectPaths.mjs (PreToolUse Edit|Write),
// gauntlet/hook/claude/checkBashCommand.mjs (PreToolUse Bash, heuristic),
// gauntlet/checkProtectedChanges.mjs (CI, authoritative).
// Change the policy HERE and nowhere else.
//
// The rule behind the list — location tells a file's nature:
//   gauntlet/   the kit, copied verbatim between projects
//   baseline/   the project's frozen debt (crap, depcruise); absent in a new project
//   root        the project's declarations: gauntlet.json and the thin tool configs that hold
//               the ratchets (thresholds) or can loosen a gate (eslint)
//   host        what executes on the developer's machine: the dev container definition and the
//               compose file it starts (mounts, privileges, images, credentials)
//   report/     disposable output, gitignored, never protected

// Fully protected: any change (add, modify, delete, rename) requires the owner.
export const FULLY_PROTECTED_PATTERNS = [
  /\.claude\/settings\.json$/,
  /\.claude\/settings\.local\.json$/,
  /^\.dependency-cruiser\.cjs$/,
  /^\.devcontainer\//,
  /^\.github\/workflows\//,
  /^baseline\//,
  /^docker\/\.env\.dist$/,
  /^docker\/compose\.yml$/,
  /^eslint\.config\.mjs$/,
  /^gauntlet\//,
  /^gauntlet\.json$/,
  /^spec\/approved\//,
  /^stryker\.config\.mjs$/,
  /^vitest\.config\.ts$/,
  /\.feature$/
];
// The two settings patterns are deliberately UNANCHORED: they must also catch
// user-level paths (~/.claude/settings.json) reached via relative traversal.

// Immutable when existing: agents may CREATE new files here, never modify or
// delete existing ones.
export const IMMUTABLE_WHEN_EXISTING_PATTERNS = [
  /^test\//
];

// Review-required in CI ONLY — hooks stay silent (the agent legitimately adds
// dependencies and cspell words). FAIL entries block the PR without the label;
// WARN entries emit a ::warning:: annotation. Promote/demote here.
export const REVIEW_REQUIRED_FAIL_PATTERNS = [
  /^\.npmrc$/,
  /^tsconfig\.json$/
];
export const REVIEW_REQUIRED_WARN_PATTERNS = [
  /^cspell\.json$/,
  /^package\.json$/
];

// Heuristic patterns for Bash command text (anchors dropped on purpose). A bare directory name
// counts (`rm -rf gauntlet`, `rm -rf spec`, `rm -rf .claude`), as does a name glued to a
// redirection (`>gauntlet.json`). `test` is the exception: the bare word is in every test
// command, so alone it counts only right after rm. The guard fires on the whole command text, so
// a command that merely MENTIONS a protected path and writes elsewhere is a false positive —
// capture output with `2>&1 | tail`, not with a redirection.
// Known holes, by construction: a path assembled at run time (shell variables, `node -e`,
// xargs, find -delete) is invisible to a regex. CI is the authoritative gate.
export const COMMAND_TEXT_PATTERNS = [
  /\.claude\/settings/,
  /(^|[\s'"=/>])\.claude(?![\w./-])/,
  /\.dependency-cruiser\.cjs/,
  /(^|[\s'"=/>])\.devcontainer(?![\w-])/,
  /(^|[\s'"=/>])\.github(?![\w./-])/,
  /\.github\/workflows/,
  /\.feature\b/,
  /(^|[\s'"=/>])baseline(?![\w.-])/,
  /--write-baseline\b/,
  /\bdocker\/(compose\.yml|\.env\.dist)\b/,
  /\beslint\.config\.mjs\b/,
  /(^|[\s'"=/>])gauntlet(?![\w-])/,
  /(^|[\s'"=/>])spec(?![\w.-])/,
  /\bstryker\.config\.mjs\b/,
  /(^|[\s'"=/>])test\//,
  /\brm(dir)?\b[^|;&]*[\s'"=/>]test(?![\w.-])/,
  /\bvitest\.config\.ts\b/
];

// Two kinds of shell writes, split by what the Edit tool can do.
// Content writes have an Edit/Write equivalent whose permission prompt shows a DIFF, which a
// shell command never does — so they are DENIED and the message points at Edit: redirection
// (but not 2>&1, >&2 or =>), tee, in-place sed, cp, touch, truncate, chmod, ln, dd, the
// baseline writers (owner commands: `--write-baseline`, depcruise `--output-to`, the
// `baseline:*` npm scripts), and git commands that write, when the command names a protected
// path (git is read-only for agents; `git log` and `git diff` are the only ones they need).
export const COMMAND_WRITE_INDICATOR =
  /((^|[^=&0-9-])>{1,2}(?!&)|\btee\b|\bsed\b[^|;&]*-i|\bcp\b|\btouch\b|\btruncate\b|\bchmod\b|\bln\b|\bdd\b|--write-baseline\b|--output-to\b|\bbaseline:(crap|depcruise)\b|\bgit\s+(add|apply|checkout|cherry-pick|clean|commit|config|merge|mv|pull|push|rebase|reset|restore|revert|rm|stash|switch)\b)/;
// Structural changes have no Edit equivalent, and their effect IS the command text, so they
// ASK the owner instead.
export const COMMAND_STRUCTURAL_INDICATOR = /\b(mv|rm|rmdir)\b/;

export const isEscapeHatchActive = () => {
  return process.env.GAUNTLET_ALLOW_PROTECTED_EDITS === '1';
};

export const matchesAny = (patternList, candidateText) => {
  return patternList.some((protectedPattern) => protectedPattern.test(candidateText));
};
