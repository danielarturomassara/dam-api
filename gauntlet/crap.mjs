#!/usr/bin/env node
// CRAP report for TypeScript: CRAP = CC^2 * (1 - coverage)^3 + CC
//
// - Cyclomatic complexity per function comes from an isolated ESLint pass
//   (gauntlet/config/complexity.eslint.mjs with `complexity: max 0`, so every function reports
//   its own CC).
// - Coverage per function is the statement coverage inside the function's range, read from
//   report/coverage/coverage-final.json (istanbul format; produced by the vitest coverage run,
//   which must run first — the gauntlet does).
// - Functions in files absent from the coverage report are N/A: with Vitest 4's
//   coverage.include every included file is reported, so absence reliably means the file is
//   coverage-excluded (composition roots), not untested.
// - Functions whose range cannot be matched to coverage data report N/A and are listed last;
//   N/A does not fail the run.
//
// Baseline: baseline/crap.json (protected, owner-generated via --write-baseline) tolerates the
// pre-test backlog: recorded offenders pass while they do not get WORSE; anything new above the
// threshold fails. A project without debt has no file. Entries are keyed by file::functionName;
// unnamed functions are keyed by kind + ordinal within the file (constructor#2, arrow-function#5).
// Renaming or moving a function — or shifting the ordinals by adding code above — drops the
// entry and it must pass outright: intended, pay the test debt when you touch the code.
//
// Usage: node gauntlet/crap.mjs [--threshold <number>] [--write-baseline]
// Exit codes: 0 ok, 1 setup/usage error, 2 new offenders above threshold.

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const BASELINE_FILE_PATH = 'baseline/crap.json';
const COVERAGE_FILE_PATH = 'report/coverage/coverage-final.json';
const COMPLEXITY_CONFIG_FILE_PATH = 'gauntlet/config/complexity.eslint.mjs';
const BASELINE_TOLERANCE = 0.01;
const DEFAULT_CRAP_THRESHOLD = 8;
const FUNCTION_MATCH_LINE_TOLERANCE = 3;

const parseThreshold = (commandLineArguments) => {
  const thresholdFlagIndex = commandLineArguments.indexOf('--threshold');

  if (thresholdFlagIndex < 0) {
    return DEFAULT_CRAP_THRESHOLD;
  }

  const thresholdValue = Number(commandLineArguments[thresholdFlagIndex + 1]);

  if (!Number.isFinite(thresholdValue) || thresholdValue <= 0) {
    console.error('Invalid --threshold value. Provide a positive number.');
    process.exit(1);
  }

  return thresholdValue;
};

const loadCoverageByRelativePath = () => {
  const coverageFilePath = resolve(COVERAGE_FILE_PATH);

  if (!existsSync(coverageFilePath)) {
    console.error(COVERAGE_FILE_PATH + ' not found. Run the coverage step first: node gauntlet/gauntlet.mjs --only test-coverage');
    process.exit(1);
  }

  const coverageByAbsolutePath = JSON.parse(readFileSync(coverageFilePath, 'utf8'));
  const coverageByRelativePath = new Map();

  for (const [absolutePath, fileCoverage] of Object.entries(coverageByAbsolutePath)) {
    const relativeFilePath = relative(process.cwd(), fileCoverage.path ?? absolutePath)
      .replaceAll('\\', '/');
    coverageByRelativePath.set(relativeFilePath, fileCoverage);
  }

  return coverageByRelativePath;
};

const collectComplexityEntries = () => {
  const eslintResult = spawnSync('npx', [
    'eslint',
    '--no-config-lookup',
    '--config', COMPLEXITY_CONFIG_FILE_PATH,
    '--format', 'json',
    'src'
  ], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

  if (!eslintResult.stdout) {
    console.error('The ESLint complexity pass produced no output.');
    console.error(eslintResult.stderr || '');
    process.exit(1);
  }

  const complexityEntries = [];

  for (const fileResult of JSON.parse(eslintResult.stdout)) {
    const relativeFilePath = relative(process.cwd(), fileResult.filePath).replaceAll('\\', '/');
    // Null prototype: 'constructor' must resolve to our counter, never to
    // Object.prototype.constructor.
    const ordinalByKind = Object.create(null);

    for (const lintMessage of fileResult.messages) {
      if (lintMessage.ruleId !== 'complexity') {
        continue;
      }

      const descriptorMatch = /^(.+?) has a complexity of (\d+)/.exec(lintMessage.message);

      if (!descriptorMatch) {
        continue;
      }

      const functionNameMatch = /'([^']+)'/.exec(descriptorMatch[1]);
      let functionName;

      if (functionNameMatch) {
        functionName = functionNameMatch[1];
      } else {
        const kindSlug = descriptorMatch[1].toLowerCase().replaceAll(' ', '-');
        ordinalByKind[kindSlug] = (ordinalByKind[kindSlug] ?? 0) + 1;
        functionName = kindSlug + '#' + ordinalByKind[kindSlug];
      }

      complexityEntries.push({
        complexity: Number(descriptorMatch[2]),
        filePath: relativeFilePath,
        functionName,
        line: lintMessage.line
      });
    }
  }

  return complexityEntries;
};

const findFunctionRange = (fileCoverage, reportedLine) => {
  let nearestRange = null;
  let nearestDistance = Number.MAX_SAFE_INTEGER;

  for (const functionMeta of Object.values(fileCoverage.fnMap)) {
    const declarationLine = functionMeta.decl?.start?.line ?? functionMeta.loc.start.line;
    const lineDistance = Math.abs(declarationLine - reportedLine);

    if (lineDistance < nearestDistance) {
      nearestDistance = lineDistance;
      nearestRange = functionMeta.loc;
    }
  }

  if (nearestDistance > FUNCTION_MATCH_LINE_TOLERANCE) {
    return null;
  }

  return nearestRange;
};

const calculateStatementCoverageFraction = (fileCoverage, functionRange) => {
  let coveredStatementCount = 0;
  let totalStatementCount = 0;

  for (const [statementId, statementRange] of Object.entries(fileCoverage.statementMap)) {
    const isInsideFunction = statementRange.start.line >= functionRange.start.line &&
      statementRange.start.line <= functionRange.end.line;

    if (!isInsideFunction) {
      continue;
    }

    totalStatementCount += 1;

    if (fileCoverage.s[statementId] > 0) {
      coveredStatementCount += 1;
    }
  }

  if (totalStatementCount === 0) {
    return null;
  }

  return coveredStatementCount / totalStatementCount;
};

const calculateCrapScore = (complexity, coverageFraction) => {
  if (coverageFraction === null) {
    return null;
  }

  const uncoveredFraction = 1 - coverageFraction;

  return (complexity ** 2) * (uncoveredFraction ** 3) + complexity;
};

const buildReportRows = (complexityEntries, coverageByRelativePath) => {
  return complexityEntries.map((complexityEntry) => {
    const fileCoverage = coverageByRelativePath.get(complexityEntry.filePath);
    let coverageFraction = null;
    // Absent from coverage => coverage-excluded file => N/A (never fails).

    if (!fileCoverage) {
      coverageFraction = null;
    } else {
      const functionRange = findFunctionRange(fileCoverage, complexityEntry.line);
      coverageFraction = functionRange
        ? calculateStatementCoverageFraction(fileCoverage, functionRange)
        : null;
    }

    return {
      ...complexityEntry,
      coverageFraction,
      crapScore: calculateCrapScore(complexityEntry.complexity, coverageFraction)
    };
  });
};

const printReport = (reportRows) => {
  const sortedRows = [...reportRows].sort((leftRow, rightRow) => {
    if (leftRow.crapScore === null && rightRow.crapScore === null) {
      return 0;
    }

    if (leftRow.crapScore === null) {
      return 1;
    }

    if (rightRow.crapScore === null) {
      return -1;
    }

    return rightRow.crapScore - leftRow.crapScore;
  });

  console.log(['CRAP'.padStart(8), 'CC'.padStart(4), 'COV%'.padStart(6), '  METHOD (FILE:LINE)'].join(''));

  for (const reportRow of sortedRows) {
    const crapText = reportRow.crapScore === null ? 'N/A' : reportRow.crapScore.toFixed(2);
    const coverageText = reportRow.coverageFraction === null
      ? 'N/A'
      : (reportRow.coverageFraction * 100).toFixed(0);
    console.log([
      crapText.padStart(8),
      String(reportRow.complexity).padStart(4),
      coverageText.padStart(6),
      '  ' + reportRow.functionName + ' (' + reportRow.filePath + ':' + reportRow.line + ')'
    ].join(''));
  }

  return sortedRows;
};

const crapThreshold = parseThreshold(process.argv.slice(2));
const coverageByRelativePath = loadCoverageByRelativePath();
const complexityEntries = collectComplexityEntries();

if (complexityEntries.length === 0) {
  console.log('No functions found to analyze.');
  process.exit(0);
}

const reportRows = buildReportRows(complexityEntries, coverageByRelativePath);
printReport(reportRows);

const buildBaselineKey = (reportRow) => {
  return reportRow.filePath + '::' + reportRow.functionName;
};

const loadBaseline = () => {
  if (!existsSync(BASELINE_FILE_PATH)) {
    return {};
  }

  return JSON.parse(readFileSync(BASELINE_FILE_PATH, 'utf8'));
};

const offenderRows = reportRows.filter(
  (reportRow) => reportRow.crapScore !== null && reportRow.crapScore > crapThreshold
);

// --write-baseline is an OWNER command (the Bash guard denies it to agents). It records every
// current offender; "only ever shrinks" is the owner's discipline, so the growth is printed
// explicitly — a new key may be a moved function or new debt, and only the owner can tell.
if (process.argv.slice(2).includes('--write-baseline')) {
  const previousBaseline = loadBaseline();
  const baselineEntries = {};

  for (const offenderRow of [...offenderRows].sort((leftRow, rightRow) => buildBaselineKey(leftRow) < buildBaselineKey(rightRow) ? -1 : 1)) {
    baselineEntries[buildBaselineKey(offenderRow)] = Number(offenderRow.crapScore.toFixed(2));
  }

  const addedKeys = Object.keys(baselineEntries).filter((baselineKey) => previousBaseline[baselineKey] === undefined);
  const removedKeys = Object.keys(previousBaseline).filter((baselineKey) => baselineEntries[baselineKey] === undefined);
  const increasedKeys = Object.keys(baselineEntries).filter((baselineKey) =>
    previousBaseline[baselineKey] !== undefined && baselineEntries[baselineKey] > previousBaseline[baselineKey] + BASELINE_TOLERANCE
  );

  mkdirSync(dirname(BASELINE_FILE_PATH), {recursive: true});
  writeFileSync(BASELINE_FILE_PATH, JSON.stringify(baselineEntries, null, 2) + '\n');
  console.log('Wrote ' + BASELINE_FILE_PATH + ' with ' + offenderRows.length + ' tolerated offenders: ' +
    addedKeys.length + ' added, ' + removedKeys.length + ' removed, ' + increasedKeys.length + ' increased.');

  for (const addedKey of addedKeys) {
    console.log('  + ' + addedKey + ' (' + baselineEntries[addedKey] + ') — new debt or a moved function; justify before committing');
  }

  for (const increasedKey of increasedKeys) {
    console.log('  ^ ' + increasedKey + ' (' + previousBaseline[increasedKey] + ' -> ' + baselineEntries[increasedKey] + ')');
  }

  process.exit(0);
}

const baseline = loadBaseline();
const newFailureRows = offenderRows.filter((offenderRow) => {
  const recordedScore = baseline[buildBaselineKey(offenderRow)];

  return recordedScore === undefined || offenderRow.crapScore > recordedScore + BASELINE_TOLERANCE;
});
const toleratedCount = offenderRows.length - newFailureRows.length;
const offenderKeySet = new Set(offenderRows.map((offenderRow) => buildBaselineKey(offenderRow)));
const staleBaselineKeys = Object.keys(baseline).filter((baselineKey) => !offenderKeySet.has(baselineKey));

if (staleBaselineKeys.length > 0) {
  console.log(staleBaselineKeys.length + ' baseline entries now pass — the owner can shrink the baseline with `npm run baseline:crap`.');
}

if (newFailureRows.length > 0) {
  console.error('CRAP threshold ' + crapThreshold + ' exceeded by ' + newFailureRows.length + ' function(s) not covered by the baseline:');

  for (const newFailureRow of newFailureRows) {
    console.error('  ' + newFailureRow.crapScore.toFixed(2) + '  ' + newFailureRow.functionName + ' (' + newFailureRow.filePath + ':' + newFailureRow.line + ')');
  }

  process.exit(2);
}

console.log('CRAP OK: no new offenders above ' + crapThreshold + ' (' + toleratedCount + ' covered by the baseline).');
process.exit(0);
