import type { Story } from '@ladle/react';
import { Example, ExampleProps } from './Example';

export const ExampleStory: Story<ExampleProps> = ({ test }) => <Example test={test} />;

ExampleStory.args = {
  test: true,
};
