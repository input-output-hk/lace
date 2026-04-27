import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const csvFilePath = process.argv[2];
if (!csvFilePath)
  throw new Error('Please provide csv file path as an argument');
if (!fs.existsSync(csvFilePath))
  throw new Error('File not found: ' + csvFilePath);

const csv = parse(fs.readFileSync(csvFilePath), { skip_empty_lines: true });
const eventNames = csv
  .map(row => row[8])
  .filter(item => item.startsWith('$') || item.includes('|'));

const ts = `// DO NOT EDIT. THIS IS A GENERATED FILE. SEE README.md.

/* eslint-disable @typescript-eslint/sort-type-constituents */
export type AnalyticsEventName =
${eventNames
  .map(eventName => `  | '${eventName.replace("'", "\\'")}'`)
  .join('\n')};
`;

const analyticsTypesFilePath = path.join(
  import.meta.dirname,
  'src',
  'analytics-event-name.ts',
);

fs.writeFileSync(analyticsTypesFilePath, ts);
