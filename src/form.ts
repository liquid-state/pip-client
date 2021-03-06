import { omit } from 'lodash';
import { IPIPForm, FormResponse, PrivateInformationProvider, JWT, ObjectType } from './types';

type RawFormSchema = {
  'page-title'?: string;
  schema: object;
  ui?: object;
  uiSchema?: object; // Some solutions use "uiSchema" as a property in their form data instead of "ui"
};

type FormSchema = {
  title?: string;
  schema: object;
  uiSchema: object;
};

type FormData = {
  data: object;
  extraData: object;
};

export default class PIPForm implements IPIPForm {
  constructor(private formId: string, private pip: PrivateInformationProvider, private jwt: JWT) {}

  async form(): Promise<FormResponse> {
    let formType = await this.pip.getObjectType(this.formId, this.jwt);
    let children = await Promise.all(
      formType.children.map(key => this.pip.getObjectType(key, this.jwt))
    );

    const [schema, translations, data] = await Promise.all<FormSchema, object, FormData>([
      this.getFormSchema(formType),
      this.getFormTranslations(children),
      this.getFormData(children),
    ]);
    return {
      ...schema,
      ...data,
      translations,
    };
  }

  async submit(formData: object, extraData: object = {}) {
    const formType = await this.pip.getObjectType(this.formId, this.jwt);
    const dataTypeKey = formType.children.find(child => child.indexOf('data') !== -1);
    if (!dataTypeKey) {
      throw `Unable to submit form data, unable to locate the data object for formId: ${this.formId}`;
    }
    const dataType = await this.pip.getObjectType(dataTypeKey, this.jwt);
    const data = { ...extraData, data: formData };
    return this.pip.updateObject(dataType, data, this.jwt);
  }

  private async getFormSchema(formType: ObjectType): Promise<FormSchema> {
    let form = await this.pip.getLatestObjectForType<RawFormSchema>(formType, this.jwt, true);
    return {
      title: form.json['page-title'],
      schema: form.json.schema,
      // Some solutions use "uiSchema" as a property in their form data instead of "ui"
      uiSchema: form.json.ui || form.json.uiSchema || {},
    };
  }

  private async getFormTranslations(childTypes: ObjectType[]): Promise<object> {
    const type = childTypes.find(type => type.slug.indexOf('i18n') !== -1);
    if (!type) {
      return {};
    }
    let translations = await this.pip.getLatestObjectForType(type, this.jwt, true);
    return (translations.json || {}) as object;
  }

  private async getFormData(childTypes: ObjectType[]): Promise<FormData> {
    const type = childTypes.find(type => type.slug.indexOf('data') !== -1);
    if (!type) {
      return {
        data: {},
        extraData: {},
      };
    }
    const formData = await this.pip.getLatestObjectForType(type, this.jwt);
    const result = (formData.json || {}) as object;
    return {
      // Support the old format for form data where the data is stored directly as formData
      // As well as the new format where it is nested in the formData.data property
      data: 'data' in result ? (result as any).data : result,
      extraData: omit(result, 'data'),
    };
  }
}
