export const getFormArrayError = (error: any, value: string): string => {
  const [list, index, item] = value.split('.');
  const position = Number(index.replace(/[!&'()*+,./:;<=>@[\\\]_|]/g, ''));

  return error?.[list]?.[position]?.[item]?.message;
};
