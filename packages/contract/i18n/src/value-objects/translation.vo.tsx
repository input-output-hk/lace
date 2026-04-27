import React from 'react';

import { Trans } from '../Trans';

import type { TranslationKey } from '../types';
import type { Tagged } from 'type-fest';

export type Translation = Tagged<React.ReactNode, 'Translation'>;
export const Translation = (reactNode: React.ReactNode): Translation =>
  reactNode as Translation;
Translation.fromKey = (key: TranslationKey): Translation =>
  Translation(<Trans i18nKey={key} />);
