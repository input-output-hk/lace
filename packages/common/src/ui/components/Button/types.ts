export type ButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  className?: string;
  children?: React.ReactNode;
  size?: 'small' | 'large' | 'medium';
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'gradient' | 'gradient-secondary';
  htmlType?: 'button' | 'submit' | 'reset';
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
};
