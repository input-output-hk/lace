import { useCallback, useState } from 'react';
import { Collection, IndexableType, PromiseExtended, Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { ToastProps } from '@lace/common';
import { useDatabaseContext } from '@src/providers/DatabaseProvider';
import { useActionExecution } from '@src/hooks/useActionExecution';
import { VersionedSchema } from '../database';
import { LIST_DEFAULT_LIMIT } from '../config';
import { getErrorMessage } from '../helpers';

type Utils<TRecord> = {
  saveRecord: (record: TRecord, params?: ToastProps) => Promise<string>;
  updateRecord: (id: number, changes: TRecord, params?: ToastProps) => Promise<string>;
  deleteRecord: (id: number, params?: ToastProps) => void;
  extendLimit: () => void;
  clearTable: () => void;
};

export type useDbStateValue<T> = {
  list: Array<T>;
  count: number;
  utils: Utils<T>;
};

export type DbQueries<TSchema, TRecord> = {
  listQuery?: (collection: Collection<TSchema, IndexableType>) => PromiseExtended<TSchema[]>;
  countQuery?: (collection: Table<TSchema, IndexableType>) => PromiseExtended<number>;
  saveRecordQuery?: (
    collection: Table<Omit<TSchema, 'id'>, IndexableType>
  ) => (record: TRecord) => PromiseExtended<IndexableType>;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useDbState = <T, TRecord>(
  intialState: Array<T>,
  schema: VersionedSchema,
  queries?: DbQueries<T, TRecord>
) => {
  const [db] = useDatabaseContext();
  const [limit, setLimit] = useState(LIST_DEFAULT_LIMIT);
  const [execute] = useActionExecution({
    shouldDisplayToastOnSuccess: true,
    getErrorMessage
  });

  const list = useLiveQuery(
    () => {
      const limitQuery = db.getConnection<T>(schema).limit(limit);
      return queries && queries?.listQuery ? queries.listQuery(limitQuery) : limitQuery.toArray();
    },
    [limit, queries],
    intialState
  );
  const count = useLiveQuery(
    () =>
      queries && queries?.countQuery
        ? queries?.countQuery(db.getConnection<T>(schema))
        : db.getConnection<T>(schema).count(),
    [queries]
  );

  const saveRecord: Utils<T | TRecord>['saveRecord'] = (record, params) =>
    execute(
      () =>
        queries && queries.saveRecordQuery
          ? queries.saveRecordQuery(db.getConnection<Omit<T, 'id'>>(schema))(record as TRecord)
          : db.getConnection<Omit<T, 'id'>>(schema).add(record as T),
      params
    );

  const updateRecord: Utils<T>['updateRecord'] = (id, changes, params) =>
    execute(() => db.getConnection<T>(schema).update(id, changes), params);

  const deleteRecord: Utils<T>['deleteRecord'] = (id, params) =>
    execute(() => db.getConnection<T>(schema).delete(id), params);

  const clearTable: Utils<T>['clearTable'] = useCallback(
    () => execute(() => db.getConnection<T>(schema).clear()),
    [db, execute, schema]
  );

  const extendLimit = useCallback(() => {
    setLimit((prevState) => prevState + LIST_DEFAULT_LIMIT);
  }, [setLimit]);

  return { list, count, utils: { saveRecord, updateRecord, deleteRecord, extendLimit, clearTable } };
};
