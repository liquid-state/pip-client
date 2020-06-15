import {
  PrivateInformationProvider,
  JWT,
  ObjectType,
  PIPObject,
  Acceptable,
  PIPUserResponse,
} from './types';

export type PIPOptions = {
  apiRoot?: string;
  als?: { getUrl(service: string, endpoint: string): string };
  fetch?: typeof fetch;
};

// Basic map of pip urls when using an apiRoot
const domainMap: { [key: string]: string } = {
  registerWithoutCode: '/api/v1/users/',
  validateCode: '/api/v1/codes/exchange/',
  registerCode: '/api/v1/codes/register/',
  objectTypes: '/api/v1/object_types/',
  acceptables: '/api/v1/acceptables/',
  acceptances: '/api/v1/acceptances/',
  appUser: `/api/admin/v1/users/`,
};

export default class PIPClient implements PrivateInformationProvider {
  private fetch: typeof fetch;

  constructor(private options: PIPOptions) {
    if (!this.options.apiRoot && !this.options.als) {
      throw 'You must provide either an apiRoot or als to create a pip client';
    }
    if (this.options.apiRoot && this.options.apiRoot.endsWith('/')) {
      this.options.apiRoot = this.options.apiRoot.slice(0, this.options.apiRoot.length - 1);
    }

    this.fetch = this.options.fetch || window.fetch.bind(window);
  }

  validateCode = async (code: string): Promise<JWT> => {
    const url = this.getUrl('validateCode');
    const resp = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    this.verifyResponse(resp);
    return (await resp.json()).jwt;
  };

  consumeCode = async (code: string, appUserId: string, jwt: JWT): Promise<void> => {
    const url = this.getUrl('registerCode');
    const resp = await this.fetch(url, {
      method: 'POST',
      headers: this.headers(jwt),
      body: JSON.stringify({
        app_user_id: appUserId,
        code,
      }),
    });
    this.verifyResponse(resp);
  };

  describeVersionsForType = async <T>(
    type: string,
    jwt: JWT,
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
    const resp = await fetch(url, { headers: this.headers(jwt) });
    this.verifyResponse(resp);
    return resp.json();
  };

  register = async (jwt: JWT): Promise<void> => {
    const url = this.getUrl('registerWithoutCode');
    const resp = await this.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jwt,
      }),
    });
    this.verifyResponse(resp);
  };

  getObjectType = async (key: string, jwt: JWT): Promise<ObjectType> => {
    const url = `${this.getUrl('objectTypes')}${key}/`;
    const resp = await this.fetch(url, { headers: this.headers(jwt) });
    this.verifyResponse(resp);
    const objectType = (await resp.json()) as ObjectType;
    // Return children and parents as object type keys instead of urls.
    const getKey = (url: string) => {
      const split = url.split('/');
      return split[split.length - 2];
    };
    objectType.children = objectType.children.map(getKey);
    objectType.parents = objectType.parents.map(getKey);
    return objectType;
  };

  getObjectsForType = async <T>(
    type: ObjectType | string,
    jwt: JWT,
    version?: string,
  ): Promise<PIPObject<T>[]> => {
    const url = `${this.buildObjectsUrl(type, version)}`;
    const resp = await this.fetch(url, { headers: this.headers(jwt) });
    this.verifyResponse(resp);
    return resp.json();
  };

  getLatestObjectForType = async <T>(
    type: ObjectType,
    jwt: JWT,
    includeNullAppUser: boolean = false,
  ): Promise<PIPObject<T>> => {
    let url = this.buildObjectsUrl(type, 'latest');
    if (includeNullAppUser) {
      url += '?include_null_app_user=1';
    }
    const resp = await this.fetch(url, {
      headers: this.headers(jwt),
    });
    this.verifyResponse(resp);
    return resp.json();
  };

  getUser = async (sub: string, jwt: JWT): Promise<PIPUserResponse> => {
    const url = `${this.getUrl('appUser')}?app_user_id=${sub}`;

    const resp = await this.fetch(url, {
      headers: this.headers(jwt),
    });

    return resp.json();
  };

  updateObject = async <T>(type: ObjectType, data: T, jwt: JWT): Promise<PIPObject<T>> => {
    const url = type.objects;
    const resp = await this.fetch(url, {
      method: 'POST',
      headers: this.headers(jwt),
      body: JSON.stringify({
        json: data,
      }),
    });
    this.verifyResponse(resp);
    return resp.json();
  };

  getAcceptable = async (id: string, jwt: JWT, version?: string): Promise<Acceptable> => {
    const baseUrl = await this.getUrl('acceptables');
    // We only care about the content not the actual acceptable item.
    const url = `${baseUrl}${id}/versions/`;
    let resp = await fetch(url, { headers: this.headers(jwt) });
    let versions = await resp.json();
    let latest = versions.results ? versions.results[0] : null;
    return latest;
  };

  sendAcceptance = async (acceptable: Acceptable, jwt: JWT): Promise<void> => {
    const baseUrl = await this.getUrl('acceptances');
    const body = JSON.stringify({ version: acceptable.uuid });
    let resp = await fetch(baseUrl, {
      method: 'POST',
      headers: this.headers(jwt),
      body: body,
    });
    return resp.json();
  };

  userHasAccepted = async (acceptable: Acceptable, jwt: JWT): Promise<boolean> => {
    const getPage = async (url: string) => {
      const resp = await fetch(url, { headers: this.headers(jwt) });
      return resp.json();
    };

    const hasAccepted = async (url: string): Promise<boolean> => {
      const { next, results }: { results: any[]; next: string } = await getPage(url);
      if (results.some(r => r.version === acceptable.url)) {
        return true;
      }
      if (next) {
        return hasAccepted(next);
      }
      return false;
    };

    const baseUrl = await this.getUrl('acceptances');
    return hasAccepted(baseUrl);
  };

  private getUrl(name: string) {
    let result;
    if (this.options.als) {
      result = this.options.als.getUrl('pip', name);
    } else if (name in domainMap) {
      result = `${this.options.apiRoot}${domainMap[name]}`;
    }
    if (result === undefined) {
      throw Error(`Unable to get url for pip client, endpoint: ${name}`);
    }
    return result;
  }

  private headers(jwt: JWT, extraHeaders = {}) {
    return {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
  }

  private verifyResponse(resp: Response) {
    if (!resp.ok) {
      throw Error(`Invalid PIP Response: ${resp}`);
    }
  }

  private buildObjectsUrl(objectType: ObjectType | string, version?: string) {
    let baseUrl = '';
    if (typeof objectType !== 'string') {
      baseUrl = objectType.objects;
    } else {
      baseUrl = `${this.getUrl('objectTypes')}${objectType}/objects/`;
    }
    if (version === 'latest') {
      let url = `${baseUrl}${version}/`;
      return url;
    }
    return version ? `${baseUrl}?version=${version}` : baseUrl;
  }

  // private buildObjectsUrl(baseUrl: string, version?: string) {
  //   return version === 'latest'
  //     ? `${baseUrl}${version}/`
  //     : version
  //       ? `${baseUrl}?version=${version}`
  //       : baseUrl;
  // }
}
