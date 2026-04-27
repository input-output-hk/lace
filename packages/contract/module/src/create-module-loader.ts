/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextLogger, isNotNil } from '@cardano-sdk/util';
import uniq from 'lodash/uniq';

import type {
  Contract,
  EmptyObjectSymbol,
  LaceModuleAddonNames,
  StoreContract,
} from './types';
import type {
  DynamicallyLoadedInit,
  ModuleExports,
  ModuleInitDependencies,
  LaceModule,
  CreateLoaderProps,
  LaceAddons,
} from './types';

export type AddonKey = keyof {
  [k in keyof Omit<
    LaceModule['addons'],
    EmptyObjectSymbol
  > as `addons.${k}`]: true;
};
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
export type LoadableKey = AddonKey | keyof ModuleExports;

// Context-aware loadable keys - scoped to available addons based on module context
type ContextualAddonKey<ProvidesAddons extends LaceModuleAddonNames> =
  ProvidesAddons extends Array<infer AddonName>
    ? AddonName extends keyof LaceAddons
      ? `addons.${AddonName & string}`
      : never
    : never;
export type ContextualLoadableKey<ProvidesAddons extends LaceModuleAddonNames> =
  ContextualAddonKey<ProvidesAddons> | keyof ModuleExports;

type DynamicallyLoadedInitType<Init> = Init extends DynamicallyLoadedInit<
  infer T
>
  ? T
  : never;

type _ModuleValue<ModuleProperty> =
  ModuleProperty extends DynamicallyLoadedInit<any>
    ? DynamicallyLoadedInitType<ModuleProperty>
    : ModuleProperty;
type ModuleOrAddon<K> = K extends keyof LaceModule
  ? LaceModule[K]
  : K extends keyof LaceAddons
  ? LaceAddons[K]
  : never;
type PropertyName<K> = K extends `${infer _}.${infer T}` ? T : K;
export type ModuleValue<K extends LoadableKey> = _ModuleValue<
  NonNullable<ModuleOrAddon<PropertyName<K>>>
>;
export type LoadResult<K extends LoadableKey> = Promise<ModuleValue<K>[]>;

const isStoreContract = (contract: Contract): contract is StoreContract =>
  contract.contractType === 'store';

export const reduceMixinsModule = (modules: LaceModule[]) => {
  return uniq(
    modules.flatMap(laceModule => [
      ...laceModule.implements.contracts,
      // load zero-or-more contract mixin
      ...(laceModule.dependsOn?.contracts.filter(
        ({ instance }) => instance === 'zero-or-more',
      ) || []),
    ]),
  )
    .filter(isStoreContract)
    .map(({ mixin }) => mixin)
    .filter(isNotNil)
    .reduce((laceModule, mixin) => mixin(laceModule), {} as LaceModule);
};

const parseLoadableKey = (loadableKey: LoadableKey) =>
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  loadableKey.split('.') as [keyof LaceModule, keyof LaceAddons | undefined];
const moduleOrAddonExport = <K extends LoadableKey>(
  m: LaceModule,
  key: K,
): ModuleValue<K> | undefined => {
  const [moduleKey, addonKey] = parseLoadableKey(key);
  const moduleValue = m[moduleKey];
  if (addonKey) {
    if (typeof moduleValue !== 'object') {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return (moduleValue as any)[addonKey];
  }
  return moduleValue as ModuleValue<K>;
};

export const createModuleLoader = (
  props: Readonly<CreateLoaderProps>,
  { logger, ...rest }: Readonly<ModuleInitDependencies>,
) => {
  const { modules } = props;

  const loadModule = async <K extends LoadableKey>(
    m: LaceModule | undefined,
    key: K,
  ): Promise<ModuleValue<K> | undefined> => {
    if (!m) return;
    const dependencies = {
      ...rest,
      logger: contextLogger(
        contextLogger(logger, m.moduleName),
        key.replace('load', ''),
      ),
    };
    const exportValue = moduleOrAddonExport(m, key);
    if (typeof exportValue === 'function') {
      const loaded = await (
        exportValue as unknown as DynamicallyLoadedInit<any>
      )();
      const defaultExport = loaded.default;
      if (typeof defaultExport === 'function') {
        return defaultExport(
          {
            ...props,
            loadModules: createModuleLoader(props, dependencies),
          },
          dependencies,
        ) as unknown as ModuleValue<K> | undefined;
      }
      return defaultExport;
    } else {
      return exportValue;
    }
  };
  const mixinsModule = reduceMixinsModule(modules);
  const mixinsAndModules = [mixinsModule, ...modules];
  return async <K extends LoadableKey>(key: K): LoadResult<K> => {
    const loaded = await Promise.all(
      mixinsAndModules.map(async m => loadModule(m, key)),
    );
    return loaded.filter(isNotNil);
  };
};

export type ModuleLoader = ReturnType<typeof createModuleLoader>;
