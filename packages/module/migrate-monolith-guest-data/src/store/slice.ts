import { createAction } from '@reduxjs/toolkit';

/**
 * Dispatched as the LAST action of an import pass. Reducer-less on purpose (the
 * `analytics/trackEvent` precedent): its whole job is ORDERING — the completion
 * leg keys off it, and redux hands it over only after every import action ahead
 * of it has been through the reducers, which is what makes "flush, then report"
 * mean "the import is in the store, then durable, then the host may delete the
 * legacy keys".
 */
const monolithGuestDataImported = createAction(
  'migrateMonolithGuestData/imported',
);

export const migrateMonolithGuestDataActions = {
  migrateMonolithGuestData: { monolithGuestDataImported },
};
