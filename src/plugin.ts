import { App } from '@liquid-state/iwa-core';
import IdentityPlugin from '@liquid-state/iwa-identity';
import PIPClient, { PIPOptions } from './client';
import PIPService, { IdentityOptions } from './service';
import { PrivateInformationProvider, IPIPService } from './types';

export type DefaultConfig = {};
export type Config = {
  apiRoot?: string
  apiRootConfigName?: string,
  useAls?: boolean,
  jwt?: string,
  useIdentity: true,
};

export type Plugin = {
  client: PrivateInformationProvider,
  service: IPIPService
};

export default class PIPPlugin {
  static key = 'pip';

  static configure(customise: (conf: DefaultConfig) => Config) {
    const options = customise({});
    return new PIPPlugin(options);
  }

  public key = PIPPlugin.key;

  private constructor(private options: Config) { };

  private apiRoot: string;

  async use(app: App): Promise<Plugin> {
    const clientOptions: PIPOptions = this.options;
    if (this.options.useAls) {
      clientOptions.als = await app.alsProvider.result();
    } else if (this.options.apiRootConfigName) {
      // Load and cache the api root from config.
      if (!this.apiRoot) {
        const { [this.options.apiRootConfigName]: apiRoot } =
          await app.configuration(this.options.apiRootConfigName);
        this.apiRoot = apiRoot;
      }
      this.options.apiRoot = this.apiRoot;
    }

    const serviceOptions: IdentityOptions = this.options;
    if (this.options.useIdentity && !this.options.jwt) {
      serviceOptions.identityProvider = app.use(IdentityPlugin).forService('pip');
    }

    const client = new PIPClient(this.options);
    const service = new PIPService(client, serviceOptions);
    return {
      client,
      service
    };
  }
}
