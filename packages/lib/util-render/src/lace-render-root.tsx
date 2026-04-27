import { isNotNil } from '@cardano-sdk/util';
import { areViewsEqual } from '@lace-contract/views';
import React, { memo, useState, useEffect } from 'react';

import { IfLocationMatch } from './if-location-match';

import type {
  ModuleInitDependencies,
  ModuleInitProps,
} from '@lace-contract/module';
import type { Render, View } from '@lace-contract/views';

export interface RenderLayoutProps {
  dependencies: ModuleInitDependencies;
  moduleInitProps: ModuleInitProps;
  view: View;
}

export const LaceRenderRoot: React.ComponentType<RenderLayoutProps> = memo(
  ({ moduleInitProps, dependencies, view }) => {
    const [render, setRender] = useState<Render[]>([]);

    useEffect(() => {
      const getComponents = async () => {
        const render = await moduleInitProps.loadModules('addons.renderRoot');
        const typeRenderModules = await Promise.all(
          render
            .map(m => m[view.type])
            .filter(isNotNil)
            .map(async load => load()),
        );

        const loaded = await Promise.all(
          typeRenderModules.flatMap(async m =>
            m?.default(moduleInitProps, dependencies),
          ),
        );
        setRender(loaded.flat());
      };
      void getComponents();
    }, [dependencies, moduleInitProps, view.type]);

    return render.map(({ Component, key, locationPattern }) => (
      <IfLocationMatch
        view={view}
        key={key}
        pathnamePattern={locationPattern || /.*/}>
        <Component />
      </IfLocationMatch>
    ));
  },
  (previousProps, nextProps) =>
    areViewsEqual(previousProps.view, nextProps.view),
);
