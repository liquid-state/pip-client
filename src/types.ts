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
  register(jwt: JWT): Promise<void>;
  getObjectType(key: string, jwt: JWT): Promise<ObjectType>;
  getObjectsForType<T>(type: ObjectType, jwt: JWT, version?: string): Promise<PIPObject<T>[]>;
  getLatestObjectForType<T>(type: ObjectType, jwt: JWT): Promise<PIPObject<T>>;
  updateObject<T>(type: ObjectType, data: T, jwt: JWT): Promise<PIPObject<T>>;
  getAcceptable(id: string, jwt: JWT, version?: string): Promise<Acceptable>;
  sendAcceptance(acceptable: Acceptable, jwt: JWT): Promise<void>;
  userHasAccepted(acceptable: Acceptable, jwt: JWT): Promise<boolean>;
}

export interface IPIPService {
  authenticateViaCode(code: string): Promise<JWT>;
  consumeCode(code: string, userId: string): Promise<void>;
  register(): Promise<void>;
  getUserData<T>(dataType: string): Promise<PIPObject<T>>;
  putUserData<T>(dataType: string, data: T): Promise<PIPObject<T>>;
  raw(url: string, init: RequestInit): Promise<Response>;
  form(id: string): Promise<IPIPForm>;
  acceptable(id: string): Promise<IPIPAcceptable>;
}

export interface IPIPAcceptable {
  acceptable(): Promise<Acceptable>;
  isAccepted(): Promise<boolean>;
  content(languages: string[]): Promise<AcceptableContent>;
  accept(): Promise<void>;
}

export type FormResponse = {
  title?: string;
  schema: object;
  uiSchema: object;
  data: object;
  extraData: object;
  translations?: object;
};

export interface IPIPForm {
  form(): Promise<FormResponse>;
  submit(formData: object, extraData?: object): Promise<object>;
}
