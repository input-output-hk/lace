interface IIogCardImage {
  alt: string;
  src: string;
  width: number;
  height: number;
}

export interface IogCardProps {
  categories?: string[];
  title?: string;
  color?: string;
  description?: string;
  image?: Partial<IIogCardImage>;
  onClick?: () => void;
}
