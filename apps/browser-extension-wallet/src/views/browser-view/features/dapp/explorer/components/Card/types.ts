interface IIogCardImage {
  alt: string;
  src: string;
  width: number;
  height: number;
}

export interface IogCardProps {
  categories?: string[];
  title?: string;
  color?: string | any;
  description?: string;
  image?: Partial<IIogCardImage>;
  onClick?: (value?: any) => void;
}
