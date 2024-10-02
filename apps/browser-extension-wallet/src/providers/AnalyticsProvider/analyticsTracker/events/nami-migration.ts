import { ExtractActionsAsUnion } from './types';

const createEvent = <E extends string>(eventSuffix: E) => `nami tool | lace | ${eventSuffix}` as const;

export const postHogNamiMigrationActions = {
  onboarding: {
    OPEN: createEvent('open'),
    ANALYTICS_AGREE_CLICK: createEvent('analytics banner | agree | click'),
    INTRODUCTION_STEP: createEvent('introduction step | pageview'),
    CUSTOMIZE_STEP: createEvent('customize step | pageview'),
    CUSTOMIZE_STEP_LACE_TAB_CLICK: createEvent('customize step | lace tab | click'),
    CUSTOMIZE_STEP_NAMI_TAB_CLICK: createEvent('customize step | nami tab | click'),
    CUSTOMIZE_STEP_LACE_MODE_CLICK: createEvent('customize step | lace mode | click'),
    CUSTOMIZE_STEP_NAMI_MODE_CLICK: createEvent('customize step | nami mode | click'),
    MIGRATION_COMPLETE: createEvent('migration successful'),
    MIGRATION_ERROR: createEvent('migration error')
  }
};

export type PostHogNamiMigrationActions = typeof postHogNamiMigrationActions;
export type PostHogNamiMigrationAction = ExtractActionsAsUnion<PostHogNamiMigrationActions>;
