import path from 'node:path';

import { APPS_ROOT, MONOREPO_ROOT, STORYBOOK_APP } from './const.mjs';

export const BASELINE_DIRECTORY = path.join(
  MONOREPO_ROOT,
  'tmp',
  STORYBOOK_APP,
  'baseline',
);

export const getBaselineReportDirectory = () => BASELINE_DIRECTORY;

// baseline report: /tmp/lace-mobile-storybook/baseline/ctrf-report.json
export const getBaselineReportPath = () =>
  path.join(BASELINE_DIRECTORY, 'ctrf-report.json');

export const CURRENT_REPORT_DIRECTORY = path.join(
  APPS_ROOT,
  STORYBOOK_APP,
  'ctrf',
);

export const getCurrentReportDirectory = () => CURRENT_REPORT_DIRECTORY;
export const getCurrentReportPath = () =>
  path.join(CURRENT_REPORT_DIRECTORY, 'ctrf-report.json');
