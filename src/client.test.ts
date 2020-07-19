import PIPClient from './client';

const fetchImpl: any = (response: any, valid: boolean = true) => {
  return jest.fn().mockImplementation((url: string, init: object) => {
    return {
      ok: valid,
      json: () => response,
    };
  });
};

describe('PIP Client', () => {
  it('Should throw if apiRoot and als are missing', () => {
    try {
      new PIPClient({});
    } catch (e) {
      expect(e).toBe('You must provide either an apiRoot or als to create a pip client');
    }
  });

  it('Should validate a code correctly', async () => {
    const f = fetchImpl({ jwt: 'test' });
    const client = new PIPClient({ apiRoot: 'test', fetch: f });
    const resp = await client.validateCode('mycode');
    expect(resp).toBe('test');
    expect(f).toHaveBeenCalled();
    expect(f).toHaveBeenCalledWith('test/api/v1/codes/exchange/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'mycode' }),
    });
  });

  it('Should consume the code correctly', async () => {
    const f = fetchImpl({});
    const client = new PIPClient({ apiRoot: 'test', fetch: f });
    const resp = await client.consumeCode('mycode', 'test', 'jwt');
    expect(resp).toBeUndefined();
    expect(f).toHaveBeenCalled();
    expect(f).toHaveBeenCalledWith('test/api/v1/codes/register/', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer jwt',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_user_id: 'test',
        code: 'mycode',
      }),
    });
  });
});
