import type { UserRole } from '@/config/roles'
import type { BillingCycle } from '@/features/subscription/types/subscription.types'

export interface AuthUser {
  id: string
  tenantId: string | null
  fullName: string
  email: string
  role: UserRole
  isActive: boolean
  loginSessionId?: string
}

export interface LoginRequestDto {
  email: string
  password: string
  captchaId?: string
  captchaAnswer?: string
  clientLabel?: string
}

export interface CaptchaChallengeResponse {
  captchaId: string
  imageDataUrl: string
  expiresInSeconds: number
}

export interface LoginResponseDto {
  accessToken: string | null
  refreshToken: string | null
  expiresIn: number
  requires2FA: boolean
  tempToken: string | null
  sessionSelectionTicket?: string | null
  activeSessions?: LoginSessionSummary[] | null
}

export interface LoginSessionSummary {
  id: string
  clientLabel: string
  lastSeenAt: string
  isCurrent: boolean
}

export interface Verify2FARequestDto {
  tempToken: string
  otp: string
  clientLabel?: string
}

export interface ChangePasswordRequestDto {
  currentPassword: string
  newPassword: string
}

export interface RegisterRequestDto {
  tenantName: string
  ownerName: string
  phone: string
  email: string
  address: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
  termsVersionId?: string
  selectedPlanId?: string
  selectedBillingCycle?: BillingCycle
}

export type RegisterResponseDto = unknown

export type VerifyEmailResponseDto = unknown

export interface ResendVerificationRequestDto {
  email: string
}

export interface ForgotPasswordRequestDto {
  email: string
}

export type ForgotPasswordResponseDto = unknown

export interface ResetPasswordRequestDto {
  token: string
  newPassword: string
}

export type ResetPasswordResponseDto = unknown

export interface UpdateProfileRequest {
  fullName?: string
  phone?: string
}

export interface UserProfileResponse {
  id: string
  tenantId: string | null
  fullName: string
  email: string
  phone: string | null
  role: string | null
  status: string
  lastLoginAt: string | null
  emailVerified: boolean
  phoneVerified: boolean
  isTwoFactorEnabled: boolean
  permissions: string[]
  assignedWarehouses: AssignedWarehouse[]
}

export interface AssignedWarehouse {
  id: string
  warehouseCode: string
  warehouseName: string
}
