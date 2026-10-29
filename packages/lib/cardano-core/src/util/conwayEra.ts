// LW-10773 remove this file

/**
 * Specifies if SDK should behave as in Conway era. Defaults to true; consumers needing
 * pre-Conway encodings must call setInConwayEra(false) and restore the default afterwards.
 */

export let inConwayEra = true;

export const setInConwayEra = (value: boolean) => (inConwayEra = value);
