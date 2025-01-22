import * as React from 'react';

import { ISimpleViewHeader } from './types';
import { IogBox, IogRow } from '../../../components/Grid';
import IogLink from '../../../components/Link';
import { IogTitle, IogText } from '../../../components/Typography';

const SimpleViewHeader = ({ filtered, category, totalItems }: ISimpleViewHeader) => (
  <IogRow className="iog-section-header" style={{ justifyContent: 'space-between' }}>
    <IogTitle as="h2" xMedium>
      {category.name}{' '}
      <IogText as="span" color="dark" bold xMedium>
        ({totalItems})
      </IogText>
    </IogTitle>

    {!filtered && (
      <IogBox>
        <IogLink to={{ search: `?category=${category.name}` }} disabled={totalItems <= 1}>
          <IogText as="span" xMedium color="primary-purple" bold>
            Show all
          </IogText>
        </IogLink>
      </IogBox>
    )}
  </IogRow>
);

export default React.memo(SimpleViewHeader);
