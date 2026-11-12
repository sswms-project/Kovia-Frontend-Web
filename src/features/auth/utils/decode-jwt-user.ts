import { USER_ROLES, type UserRole } from '@/config/roles'
import type { AuthUser } from '../types/auth.types'

const USER_ROLE_VALUES: readonly string[] = Object.values(USER_ROLES)

function decodeBase64Url(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRequiredStringClaim(payload: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  throw new Error(`Invalid JWT: missing required claim ${keys.join('/')}`)
}

function getOptionalStringClaim(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLE_VALUES.includes(value)
}

export function decodeJwtUser(token: string): AuthUser {
  const segments = token.split('.')
  if (segments.length !== 3 || !segments[1]) {
    throw new Error('Invalid JWT: expected three segments')
  }

  let payload: unknown
  try {
    payload = JSON.parse(decodeBase64Url(segments[1]))
  } catch {
    throw new Error('Invalid JWT: malformed payload')
  }

  if (!isRecord(payload)) {
    throw new Error('Invalid JWT: payload is not an object')
  }

  const id = getRequiredStringClaim(payload, ['user_id', 'sub'])
  const tenantId = getOptionalStringClaim(payload, ['tenant_id'])
  const email = getRequiredStringClaim(payload, ['email'])

  const roleClaim = payload.role
  if (!isUserRole(roleClaim)) {
    throw new Error('Invalid JWT: invalid role claim')
  }

  const fullName = typeof payload.name === 'string' ? payload.name.trim() : ''

  const loginSessionId = getOptionalStringClaim(payload, ['sid'])
  return {
    id,
    tenantId,
    fullName,
    email,
    role: roleClaim,
    isActive: true,
    ...(loginSessionId ? { loginSessionId } : {}),
  }
}
