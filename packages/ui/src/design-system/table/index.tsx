import { Body } from './table-body.component';
import { Header } from './table-header.component';
import { Row } from './table-row.component';

export type { RowProps } from './table-row.component';
export type { HeaderProps } from './table-header.component';
export type { BodyProps } from './table-body.component';

export const Table = { Row, Header, Body };

export * from './hooks';
