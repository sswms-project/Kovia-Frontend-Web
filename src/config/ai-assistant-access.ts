import { USER_ROLES } from './roles'

/** The assistant works inside one tenant; platform administrators have no tenant scope. */
export function canUseAiAssistant(user: { readonly role: string } | null): boolean {
  return user !== null && user.role !== USER_ROLES.SystemAdmin
}
