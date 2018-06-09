export type JWT = string;

export interface ObjectType {
  url: string;
  uuid: string;
  slug: string;
  name: string;
  children: string[];
  parents: string[];
  objects: string;
}

export interface PIPObject<T = object> {
  url: string;
  uuid: string;
  version: number;
  app_user: string | null;
  json: T;
}

export interface Acceptable {
  url: string;
  uuid: string;
  number: number;
  content: AcceptableContent[];
}

export interface AcceptableContent {
  language_code: string;
  display_name: string;
  content: string;
}

export interface PrivateInformationProvider {
  validateCode(code: string): Promise<JWT>;
  consumeCode(code: string, appUserId: string, jwt: JWT): Promise<void>;
  getObjectType(key: string, jwt: JWT): Promise<ObjectType>;
  getObjectsForType<T>(type: ObjectType, jwt: JWT, version?: string): Promise<PIPObject<T>[]>;
  getLatestObjectForType<T>(type: ObjectType, jwt: JWT): Promise<PIPObject<T>>;
  updateObject<T>(type: ObjectType, data: T, jwt: JWT): Promise<PIPObject<T>>;
  getAcceptable(id: string, jwt: JWT, version?: string): Promise<Acceptable>;
  sendAcceptance(acceptable: Acceptable, jwt: JWT): Promise<void>;
  userHasAccepted(acceptable: Acceptable, jwt: JWT): Promise<boolean>;
}
