import { DataTable } from '@cucumber/cucumber';

export const dataTableAsStringArray = (options: DataTable): string[] => options.raw().map((array) => array[0]);
