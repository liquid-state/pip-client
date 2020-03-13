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
};

export default class PIPAdminClient {
  private options: IOptions;
  constructor(private identity: IdentityOptions, options?: IOptions) {
    this.options = options ? options : defaultOptions;
  }

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

  getObjectsForType = async <T>(type: ObjectType | string): Promise<PIPObject<T>[]> => {
    const url = this.buildObjectsUrl(type);
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  getLatestObjectsForUsers = async <T>(
    type: ObjectType | string,
    users: string[]
  ): Promise<PIPObject<T>[]> => {
    const url = this.buildObjectsUrl(type, 'latest', users);
    const resp = await fetch(url, { headers: this.headers() });
    this.verifyResponse(resp);
    return resp.json();
  };

  createObject = async <T>(type: ObjectType | string, json: object): Promise<PIPObject<T>> => {
    const url = this.buildObjectsUrl(type);

    const resp = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_user: null,
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
    children?: string[]
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

  private buildObjectsUrl(objectType: ObjectType | string, version?: string, users?: string[]) {
    let baseUrl = '';
    if (typeof objectType !== 'string') {
      baseUrl = objectType.objects;
    } else {
      baseUrl = `${this.getUrl('objectTypes')}${objectType}/objects/`;
    }
    if (version === 'latest') {
      let url = `${baseUrl}${version}/`;
      if (users) {
        url = `${url}?app_users=${JSON.stringify(users)}`;
      }
      return url;
    }
    return version ? `${baseUrl}?version=${version}` : baseUrl;
  }
}
