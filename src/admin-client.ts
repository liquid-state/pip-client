import { ObjectType, PIPObject } from './types';

interface IOptions {
  apiRoot?: string;
}

interface IdentityOptions {
  jwt?: string;
  apiKey?: string;
}

const defaultOptions = {
  apiRoot: 'https://pip.liquid-state.com/',
};

// Basic map of pip urls when using an apiRoot
const domainMap: { [key: string]: string } = {
  validateCode: '/api/v1/codes/exchange/',
  registerCode: '/api/v1/codes/register/',
  objectTypes: '/api/v1/object_types/',
  acceptables: '/api/v1/acceptables/',
  acceptances: '/api/v1/acceptances/',
  users: '/api/admin/v1/users/',
  app: '/api/admin/v1/apps/',
  code: '/api/admin/v1/codes/',
};

export default class PIPAdminClient {
  private options: IOptions;
  constructor(private identity: IdentityOptions, options?: IOptions) {
    this.options = options ? options : defaultOptions;
  }

  getApp = async (appToken: string): Promise<object> => {
    const url = `${this.getUrl('app')}${appToken}/`;
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  getAppUser = async (appUserUISId: string): Promise<object> => {
    const url = `${this.getUrl('users')}?app_user_id=${appUserUISId}`;
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  createAppUser = async (
    appUUID: string,
    appUserUISId: string,
    userType?: string,
    code?: string,
  ): Promise<object> => {
    const url = `${this.getUrl('users')}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app: appUUID,
        app_user_id: appUserUISId,
        user_type: userType || '',
        code: code || '',
      }),
    });
    this.verifyResponse(resp);
    return resp.json();
  };

  createCodeForAppUser = async (userId: string) => {
    const url = this.getUrl('code');
    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ app_user: userId, code: this.generateRandomCode() }),
    });

    return resp;
  };

  listObjectTypes = async (): Promise<ObjectType[]> => {
    const url = this.getUrl('objectTypes');
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    const types = (await resp.json()) as ObjectType[];
    // Return children and parents as object type keys instead of urls.
    const getKey = (url: string) => url.substr(url.lastIndexOf('/') + 1);
    return types.map(type => ({
      ...type,
      children: type.children.map(getKey),
      parents: type.parents.map(getKey),
    }));
  };

  getObjectType = async (key: string): Promise<ObjectType> => {
    const url = `${this.getUrl('objectTypes')}${key}/`;
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    const objectType = (await resp.json()) as ObjectType;
    // Return children and parents as object type keys instead of urls.
    const getKey = (url: string) => url.substr(url.lastIndexOf('/') + 1);
    objectType.children = objectType.children.map(getKey);
    objectType.parents = objectType.parents.map(getKey);
    return objectType;
  };

  getObjectsForType = async <T>(
    type: ObjectType | string,
    version?: string,
    appUser?: string,
  ): Promise<PIPObject<T>[]> => {
    const url = this.buildObjectsUrl(type, version, appUser);
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  describeVersionsForType = async <T>(
    type: string,
    appUser?: string,
    appUserObjectTypes?: string[],
  ): Promise<PIPObject<T>[]> => {
    let url = `${this.getUrl('objectTypes')}${type}/describe_versions/`;
    if (appUser) {
      url += `?app_user=${appUser}`;
      if (appUserObjectTypes) {
        url += `&app_user_object_types=${appUserObjectTypes.join(',')}`;
      }
    }
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  getLatestObjectsForUsers = async <T>(
    type: ObjectType | string,
    appUsers: string[],
  ): Promise<PIPObject<T>[]> => {
    let url = this.buildObjectsUrl(type, 'latest');
    if (appUsers) {
      if (appUsers.length === 1) {
        url = this.buildObjectsUrl(type, 'latest', appUsers[0]);
      } else {
        url = `${url}?app_users=${JSON.stringify(appUsers)}}`;
      }
    }
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  createObject = async <T>(
    type: ObjectType | string,
    json: object,
    app_user?: string,
  ): Promise<PIPObject<T>> => {
    const url = this.buildObjectsUrl(type);

    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_user: app_user || null,
        json,
      }),
    });
    this.verifyResponse(resp);
    return resp.json();
  };

  createObjectType = async (
    name: string,
    app: string,
    parents?: string[],
    children?: string[],
  ): Promise<ObjectType> => {
    const url = this.getUrl('objectTypes');

    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name,
        app,
        children: children || [],
        parents: parents || [],
      }),
    });
    this.verifyResponse(resp);
    return resp.json();
  };

  private getUrl(name: string) {
    let result;
    if (name in domainMap) {
      result = `${this.options.apiRoot}${domainMap[name]}`;
    }
    if (result === undefined) {
      throw Error(`Unable to get url for pip client, endpoint: ${name}`);
    }
    return result;
  }

  private headers(extraHeaders = {}) {
    const auth = this.identity.jwt
      ? `Bearer ${this.identity.jwt}`
      : `Token ${this.identity.apiKey}`;
    return {
      Authorization: auth,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  private verifyResponse(resp: Response) {
    if (!resp.ok) {
      throw Error(`Invalid PIP Response: ${resp}`);
    }
  }

  private generateRandomCode() {
    return Math.random()
      .toString(16)
      .substring(2, 8)
      .toUpperCase();
  }

  private buildObjectsUrl(objectType: ObjectType | string, version?: string, app_user?: string) {
    let baseUrl = '';
    if (typeof objectType !== 'string') {
      baseUrl = objectType.objects;
    } else {
      baseUrl = `${this.getUrl('objectTypes')}${objectType}/objects/`;
    }
    if (version === 'latest') {
      let url = `${baseUrl}${version}/`;
      if (app_user) {
        url = `${url}?app_user=${app_user}`;
      }
      return url;
    }
    return version ? `${baseUrl}?version=${version}` : baseUrl;
  }
}
