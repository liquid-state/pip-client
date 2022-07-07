import {
  PrivateInformationProvider,
  IPIPService,
  JWT,
  PIPObject,
  IPIPForm,
  IPIPAcceptable,
  PIPUser,
} from './types';
import { IIdentityProvider } from '@liquid-state/iwa-identity/dist/manager';
import PIPForm from './form';
import PIPAcceptable from './acceptable';

export type IdentityOptions = {
  jwt?: string;
  identityProvider?: IIdentityProvider<any>;
};

export default class PIPService implements IPIPService {
  private _jwt: string | undefined = undefined;

  constructor(private pip: PrivateInformationProvider, private identity: IdentityOptions) { }

  form = async (id: string): Promise<IPIPForm> => {
    return new PIPForm(id, this.pip, await this.jwt());
  };

  acceptable = async (id: string): Promise<IPIPAcceptable> => {
    return new PIPAcceptable(id, this.pip, await this.jwt());
  };

  authenticateViaCode = async (code: string): Promise<JWT> => {
    const jwt = await this.pip.validateCode(code);
    await this.updateIdentity(jwt);
    return jwt;
  };

  consumeCode = async (code: string, userId: string): Promise<void> => {
    const jwt = await this.jwt();
    return this.pip.consumeCode(code, userId, jwt);
  };

  register = async (): Promise<void> => {
    const jwt = await this.jwt();
    return this.pip.register(jwt);
  };

  getUser = async (sub: string): Promise<PIPUser> => {
    const jwt = await this.jwt();
    const body = await this.pip.getUser(sub, jwt);

    return body.results[0];
  };

  getUserData = async <T>(dataType: string, includeNullAppUser = false): Promise<PIPObject<T>> => {
    const jwt = await this.jwt();
    const objectType = await this.pip.getObjectType(dataType, jwt);
    return this.pip.getLatestObjectForType<T>(objectType, jwt, includeNullAppUser);
  };

  putUserData = async <T>(dataType: string, data: T, status?: string): Promise<PIPObject<T>> => {
    const jwt = await this.jwt();
    const objectType = await this.pip.getObjectType(dataType, jwt);
    return this.pip.updateObject(objectType, data, jwt, status);
  };

  editUserData = async<T>(existing: PIPObject<T>, data: T, status?: string): Promise<PIPObject<T>> => {
    const jwt = await this.jwt();
    return this.pip.editObject(existing, data, jwt, status);
  }

  deleteUserData = async(existing: PIPObject): Promise<PIPObject> => {
    const jwt = await this.jwt();
    return this.pip.deleteObject(existing, jwt);
  }

  /* Provides an interface for calling pip directly.

  Expects the user to provide a fully qualified url, request parameters etc.
  The only thing this method does is inject the Authorization header if it is missing.
  */
  raw = async (url: string, init: RequestInit = {}): Promise<Response> => {
    let jwt;
    try {
      jwt = await this.jwt();
    } catch (e) {
      // We have no jwt, continue.
    }
    if (jwt) {
      if (init.headers && init.headers.constructor === Headers) {
        init.headers = init.headers as Headers;
        if (!init.headers.has('Authorization')) {
          init.headers.set('Authorization', `Bearer ${jwt}`);
        }
      } else if (init.headers && !('Authorization' in init.headers)) {
        (init.headers as any)['Authorization'] = `Bearer ${jwt}`;
      } else if (!init.headers) {
        init.headers = { Authorization: `Bearer ${jwt}` };
      }
    }

    return fetch(url, init);
  };

  private async updateIdentity(jwt: JWT) {
    if (this.identity.identityProvider) {
      await this.identity.identityProvider.update(jwt, { jwt });
    }
    this._jwt = jwt;
  }

  private async jwt(): Promise<string> {
    if (!this._jwt) {
      if (this.identity.jwt) {
        this._jwt = this.identity.jwt;
      } else if (this.identity.identityProvider) {
        const id = await this.identity.identityProvider.getIdentity();
        if (id.credentials && id.credentials.jwt) {
          // Don't actually set this against the cached _jwt value.
          // Expect identityProvider to handle the caching for us.
          return id.credentials.jwt;
        }
      }
    }
    if (!this._jwt) {
      throw 'Unable to access pip, no valid authentication mechanism!';
    }
    return this._jwt;
  }
}
