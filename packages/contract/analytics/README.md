# @lace-contract/analytics

## Adding new analytics events

1. Add them to the [spreadsheet](https://docs.google.com/spreadsheets/d/1lnXpVsC7i0TPMpRhFuMinld3Z6lBiCx8h41TuAgB4AY?gid=1271148884#gid=1271148884)
2. File -> Download -> Comma Separated Values (.csv)
3. `cd packages/contract/analytics`
4. `node generate-analytics-events.mjs /path/to/downloaded.csv`
5. `npx prettier --write src/analytics-event-name.ts`
