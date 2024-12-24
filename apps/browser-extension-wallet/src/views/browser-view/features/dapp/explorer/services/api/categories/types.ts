import { IDApp } from '../d-app/types';

interface ISubcategory {
  id: number;
  name: string;
  description: string;
  category: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IFormatsImage {
  ext: string;
  url: string;
  hash: string;
  mime: string;
  name: string;
  path?: any;
  size: number;
  width: number;
  height: number;
}

interface IFormats {
  small: IFormatsImage;
  thumbnail: IFormatsImage;
  large: IFormatsImage;
  medium: IFormatsImage;
}

interface IImage {
  id: number;
  name: string;
  alternativeText?: any;
  caption?: any;
  width: number;
  height: number;
  formats: IFormats;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: any;
  provider: string;
  providerMetadata?: any;
  createdAt: Date;
  updatedAt: Date;
}
export interface IFeature {
  id: number;
  title: string;
  description: string;
  picture: IImage;
}

export interface ICertification {
  id: number;
  name: string;
  level: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  icon: IImage;
}
export interface ICertificate {
  id: number;
  certification: ICertification;
  issuedAt: string;
  pdfLink: string;
  summary: string;
}

export interface ILottie {
  id: number;
  name: string;
  alternativeText: string;
  caption: string;
  width?: any;
  height?: any;
  formats?: any;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: any;
  provider: string;
  providerMetadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICategory {
  id: number;
  name: string;
  description: string;
  primaryColor: string;
  lottie?: ILottie;
  secondaryColor: string;
  createdAt?: Date;
  updatedAt?: Date;
  position?: number;
  subcategories?: ISubcategory[];
  dApps?: IDApp[];
  value?: string;
}
