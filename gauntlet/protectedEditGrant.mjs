import {readFileSync} from 'node:fs';

export const GRANT_FILE_PATH = '.claude/grant/protectedEdits.json';
export const MAXIMUM_GRANT_MINUTES = 60;

const MILLISECONDS_PER_MINUTE = 60_000;

const NEVER_GRANTABLE_PATTERNS = [
  /(^|\/)\.claude\//,
  /^\.github\/workflows\//,
  /(^|\/)CLAUDE\.local\.md$/i,
  /(^|\/)CLAUDE\.md$/i,
  /^gauntlet\//,
  /^gauntlet\.json$/
];

const isUsablePathEntry = (pathEntry) => {
  return typeof pathEntry === 'string' && pathEntry.length > 0 && !pathEntry.startsWith('/') && !pathEntry.split('/').includes('..');
};

const readGrant = () => {
  try {
    return JSON.parse(readFileSync(GRANT_FILE_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const isGrantInForce = (grant, nowMilliseconds) => {
  if (typeof grant !== 'object' || grant === null || typeof grant.reason !== 'string' || grant.reason.length === 0) {
    return false;
  }

  if (!Array.isArray(grant.paths) || grant.paths.length === 0 || !grant.paths.every(isUsablePathEntry)) {
    return false;
  }

  const expiresAtMilliseconds = typeof grant.expiresAt === 'string' ? Date.parse(grant.expiresAt) : Number.NaN;

  return expiresAtMilliseconds > nowMilliseconds && expiresAtMilliseconds <= nowMilliseconds + MAXIMUM_GRANT_MINUTES * MILLISECONDS_PER_MINUTE;
};

const isPathCoveredByEntry = (relativeFilePath, pathEntry) => {
  return pathEntry.endsWith('/') ? relativeFilePath.startsWith(pathEntry) : relativeFilePath === pathEntry;
};

export const isCoveredByGrant = (relativeFilePath, nowMilliseconds = Date.now()) => {
  if (NEVER_GRANTABLE_PATTERNS.some((neverGrantablePattern) => neverGrantablePattern.test(relativeFilePath))) {
    return false;
  }

  const grant = readGrant();

  return isGrantInForce(grant, nowMilliseconds) && grant.paths.some((pathEntry) => isPathCoveredByEntry(relativeFilePath, pathEntry));
};
