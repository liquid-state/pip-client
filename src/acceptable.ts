import { identity } from 'lodash';
import {
  IPIPAcceptable,
  PrivateInformationProvider,
  JWT,
  AcceptableItem,
  AppUserAcceptable,
  AcceptableVersion,
  AcceptableContent,
} from './types';
import PIPAdminClient from './admin-client';

export default class implements IPIPAcceptable {
  private _acceptable: AppUserAcceptable;

  constructor(
    private acceptableId: string,
    private pip: PrivateInformationProvider,
    private jwt: JWT,
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
  private _acceptableItem: AcceptableItem;
  private _acceptableVersion: AcceptableVersion;

  constructor(private acceptableId: string, private pip: PIPAdminClient) {}

  async acceptableItem() {
    if (!this._acceptableItem) {
      this._acceptableItem = await this.pip.getAcceptableItem(this.acceptableId);
    }
    return this._acceptableItem;
  }

  async acceptable() {
    if (!this._acceptableVersion) {
      this._acceptableVersion = await this.pip.getAcceptable(this.acceptableId, true);
    }
    return this._acceptableVersion;
  }

  async isAccepted() {
    const acceptable = await this.acceptable();
    return this.pip.currentUserHasAccepted(acceptable);
  }

  async content(languages: string[]) {
    const acceptableItem = await this.acceptableItem();
    const acceptableVersion = await this.acceptable();
    const content = acceptableVersion.content;
    console.log('Content', content);
    // Map languages to the matching acceptable data,
    // return the first one which is not undefined.
    const matchableLanguages = [...languages, acceptableItem.default_content_language_code];
    console.log('matchableLanguages: ', matchableLanguages);
    const result = matchableLanguages
      .map(lng => content.find(c => c.language_code === lng))
      .find(identity);
    if (!result) {
      throw 'No acceptable matches the languages supplied. Default content is presumably not configured.';
    }
    return result;
  }

  async accept(content: AcceptableContent) {
    const acceptable = await this.acceptable();
    await this.pip.sendAcceptance(acceptable, content);
  }
}
