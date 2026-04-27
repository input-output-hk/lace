import { filter, take } from 'rxjs';

import type { ActionCreators } from '..';
import type { ActionObservables } from '@lace-contract/module';
import type { View } from '@lace-contract/views';

export const viewClose = (
  { views: { closeView$ } }: ActionObservables<ActionCreators>,
  view: View,
) =>
  closeView$.pipe(
    filter(action => action.payload === view.id),
    take(1),
  );
