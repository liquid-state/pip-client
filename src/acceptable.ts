import { identity } from 'lodash';
import { IPIPAcceptable, PrivateInformationProvider, JWT, Acceptable } from './types';

export default class implements IPIPAcceptable {
  private _acceptable: Acceptable;

  constructor(
    private acceptableId: string,
    private pip: PrivateInformationProvider,
    private jwt: JWT
  ) {}

  async acceptable() {
    if (!this._acceptable) {
      this._acceptable = await this.pip.getAcceptable(this.acceptableId, this.jwt);
    }
    return this._acceptable;
  }

  async isAccepted() {
    const acceptable = await this.acceptable();
    return this.pip.userHasAccepted(acceptable, this.jwt);
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
    await this.pip.sendAcceptance(acceptable, this.jwt);
  }
}
