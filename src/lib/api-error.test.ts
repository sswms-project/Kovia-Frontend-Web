import { describe, expect, it } from 'vitest'
import { getErrorKind } from './api-error'

describe('getErrorKind', () => {
  it.each([
    [{ statusCode: 401, message: 'x' }, 'unauthorized'],
    [{ statusCode: 403, message: 'x' }, 'forbidden'],
    [{ statusCode: 404, message: 'x' }, 'notFound'],
    [{ statusCode: 500, message: 'Internal' }, 'server'],
    [{ statusCode: 500, message: 'Network Error' }, 'network'],
    [{ statusCode: 500, message: 'timeout of 30000ms exceeded' }, 'network'],
    [{ statusCode: 400, message: 'Bad request' }, 'unknown'],
    [new Error('boom'), 'unknown'],
  ])('classifies %j as %s', (error, kind) => {
    expect(getErrorKind(error).kind).toBe(kind)
  })

  it('omits the status for network errors', () => {
    expect(getErrorKind({ statusCode: 500, message: 'Network Error' }).status).toBeUndefined()
  })
})
