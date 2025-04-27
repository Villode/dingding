import { Endpoint } from '../endpoint'

export class GetInfo extends Endpoint {
  schema = {
    request: {},
    responses: {
      '200': {
        description: 'Returns basic info',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
    },
  }

  async handle() {
    return {
      a: 1,
    }
  }
}
