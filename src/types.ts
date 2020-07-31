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

export interface AcceptableDocument {
  type: 'document';
  [key: string]: any;
  product_id: string;
  version: number;
  url: string;
}

export interface AppUserAcceptableVersion {
  uuid: string;
  number: number;
}

export interface AppUserAcceptableContent {
  uuid: string;
  language_code: string;
  display_name: string;
  content: string | null;
  data: AcceptableDocument | { type: string;[key: string]: any };
}

export interface AppUserAcceptable {
  name: string;
  slug: string;
  url: string;
  uuid: string;
  default_content_language_code: string;
  latest_version: AppUserAcceptableVersion & { version_content: AppUserAcceptableContent };
  latest_acceptance: {
    app_user: string;
    version: AppUserAcceptableVersion;
    version_content: AppUserAcceptableContent;
    created: string;
  } | null;
}

export interface AcceptableVersion {
  url: string;
  uuid: string;
  number: number;
  content: AcceptableContent[];
  status: string;
}

export interface AcceptableContent {
  uuid: string;
  language_code: string;
  display_name: string;
  content: string | null;
  data: AcceptableDocument | { type: string;[key: string]: any };
}

export interface PrivateInformationProvider {
  validateCode(code: string): Promise<JWT>;
  consumeCode(code: string, appUserId: string, jwt: JWT): Promise<void>;
  register(jwt: JWT): Promise<void>;
  getObjectType(key: string, jwt: JWT): Promise<ObjectType>;
  getObjectsForType<T>(type: ObjectType, jwt: JWT, version?: string): Promise<PIPObject<T>[]>;
  getLatestObjectForType<T>(
    type: ObjectType,
    jwt: JWT,
    includeNullAppUser?: boolean
  ): Promise<PIPObject<T>>;
  updateObject<T>(type: ObjectType, data: T, jwt: JWT, status?: string): Promise<PIPObject<T>>;
  getAcceptable(id: string, jwt: JWT, languages?: string[]): Promise<AppUserAcceptable>;
  sendAcceptance(acceptable: AppUserAcceptable, jwt: JWT): Promise<void>;
  getUser(sub: string, jwt: JWT): Promise<PIPUserResponse>;
}

export interface IPIPService {
  authenticateViaCode(code: string): Promise<JWT>;
  consumeCode(code: string, userId: string): Promise<void>;
  register(): Promise<void>;
  getUserData<T>(dataType: string): Promise<PIPObject<T>>;
  putUserData<T>(dataType: string, data: T, status?: string): Promise<PIPObject<T>>;
  raw(url: string, init: RequestInit): Promise<Response>;
  form(id: string): Promise<IPIPForm>;
  acceptable(id: string): Promise<IPIPAcceptable>;
}

export interface IPIPAcceptable {
  acceptable(languages: string[]): Promise<AppUserAcceptable>;
  isAccepted(): Promise<boolean>;
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

export type PIPUser = {
  app: string;
  app_user_id: string;
  codes: any[];
  url: string;
  user_type?: string;
  username?: string;
  uuid: string;
};

export type PIPUserResponse = {
  count: number;
  next?: string;
  previous?: string;
  results: PIPUser[];
};
