import styles from './Example.module.scss';

export type ExampleProps = {
  test?: boolean;
};

export const Example = ({ test = false }: ExampleProps) => (
  <h1 className={styles.root}>
    This is an example component! <pre>{test.toString()}</pre>
  </h1>
);
