export type JsonType =
  | JsonType[]
  | boolean
  | number
  | string
  | {
      [key: string]: JsonType;
    }
  | null;
