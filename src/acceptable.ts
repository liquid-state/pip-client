import { identity } from 'lodash';
import { IPIPAcceptable, PrivateInformationProvider, JWT, AppUserAcceptable, AcceptableVersion } from './types';
import PIPAdminClient from './admin-client';

export default class implements IPIPAcceptable {
  private _acceptable: AppUserAcceptable;

  constructor(
    private acceptableId: string,
    private pip: PrivateInformationProvider,
    private jwt: JWT
  ) {}

  async acceptable(languages?: string[]) {
    if (!this._acceptable) {
      this._acceptable = await this.pip.getAcceptable(this.acceptableId, this.jwt, languages);
    }
    return this._acceptable;
  }

  async isAccepted() {
    const acceptable = await this.acceptable();
    return acceptable.latest_version.number === acceptable.latest_acceptance?.version.number;
  }

  async accept() {
    const acceptable = await this.acceptable();
    await this.pip.sendAcceptance(acceptable, this.jwt);
  }
}

export class PIPAdminAcceptable {
  private _acceptable: AcceptableVersion;

  constructor(
    private acceptableId: string,
    private pip: PIPAdminClient,
  ) {}

  async acceptable() {
    if (!this._acceptable) {
      this._acceptable = await this.pip.getAcceptable(this.acceptableId);
    }
    return this._acceptable;
  }

  async isAccepted() {
    const acceptable = await this.acceptable();
    return this.pip.currentUserHasAccepted(acceptable);
  }

  async content(languages: string[]) {
    const acceptable = await this.acceptable();
    const content = acceptable.content;
    // Map languages to the matching acceptable data,
    // return the first one which is not undefined.
    const result = languages.map(lng => content.find(c => c.language_code === lng)).find(identity);
    if (!result) {
      throw 'No acceptable matches the languages supplied.';
    }
    return result;
  }

  async accept() {
    const acceptable = await this.acceptable();
    await this.pip.sendAcceptance(acceptable);
  }
}