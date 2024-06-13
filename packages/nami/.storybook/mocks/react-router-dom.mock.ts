import { fn } from '@storybook/test';

import * as router from 'react-router-dom'

export * from 'react-router-dom';

export const useHistory = fn(router.useHistory).mockName('useHistory');
