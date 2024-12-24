export interface ICategory {
  id: string;
  name: string;
}

export type IImage = string;

export interface IDAppScreenShot {
  data: string;
}

export interface IDApp {
  projectName: string;
  subject: string;
  longDescription: string;
  categories: ICategory[];
  companyName: string;
  companyEmail: string;
  companyWebsite: string;
  link: string;
  logo: IImage;
  screenshots: IDAppScreenShot[];
  shortDescription: string;
  permissionToAggregate: string;
  containsProfanityWords: boolean;
}

export type PaginationInput = {
  offset: number;
  limit: number;
};
