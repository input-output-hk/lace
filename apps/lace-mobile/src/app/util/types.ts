import type { Action, State } from '@lace-contract/module';
import type { Store } from '@reduxjs/toolkit';

export type ThemePreference = 'dark' | 'light' | 'system';

export type LaceStore = Store<State, Action>;
