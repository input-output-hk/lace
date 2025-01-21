interface IIogCardImage {
  alt: string;
  src: string;
}

export interface IogCardProps {
  categories: string[];
  title: string;
  image?: IIogCardImage;
  onClick: () => void;
}
