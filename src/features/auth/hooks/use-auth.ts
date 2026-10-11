import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { queryKeys } from '@/lib/query-keys'
import type { ApiErrorResponse, ApiResponse } from '@/types/api'
import { authService } from '../services/auth.service'
import type {
  ChangePasswordRequestDto,
  CaptchaChallengeResponse,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
  ResendVerificationRequestDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  UpdateProfileRequest,
  UserProfileResponse,
  Verify2FARequestDto,
  VerifyEmailResponseDto,
} from '../types/auth.types'

function logAuthError(action: string, error: ApiErrorResponse) {
  logger.warn(`[auth] ${action} failed`, {
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors,
  })
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: authService.login,
    onError: (error: ApiErrorResponse) => {
      logAuthError('login', error)
    },
  })
}

export function useCaptchaMutation() {
  return useMutation<ApiResponse<CaptchaChallengeResponse>, ApiErrorResponse, void>({
    mutationFn: authService.createCaptcha,
    onError: (error) => {
      logAuthError('create captcha', error)
      toast.error(error.message ?? 'Không thể tải CAPTCHA. Vui lòng thử lại.')
    },
  })
}

export function useLogoutMutation() {
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, void>({
    mutationFn: authService.logout,
    onError: (error) => {
      logAuthError('logout', error)
      toast.error('Không thể đóng phiên trên máy chủ. Phiên trên thiết bị đã được xóa.')
    },
  })
}

export function useRegisterMutation() {
  return useMutation<ApiResponse<RegisterResponseDto>, ApiErrorResponse, RegisterRequestDto>({
    mutationFn: authService.registerTenant,
    onError: (error) => {
      logAuthError('register', error)
      toast.error(error.message ?? 'Không thể đăng ký tài khoản. Vui lòng thử lại.')
    },
  })
}

export function useVerifyEmailQuery(token?: string) {
  return useQuery<ApiResponse<VerifyEmailResponseDto>, ApiErrorResponse>({
    queryKey: ['auth', 'verify-email', token],
    queryFn: () => authService.verifyEmail(token ?? ''),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useResendVerificationMutation() {
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ResendVerificationRequestDto>({
    mutationFn: authService.resendVerification,
    onSuccess: (response) => toast.success(response.message),
    onError: (error) => {
      logAuthError('resend verification', error)
      toast.error(error.message ?? 'Không thể gửi lại email xác minh. Vui lòng thử lại.')
    },
  })
}

export function useForgotPassword() {
  return useMutation<
    ApiResponse<ForgotPasswordResponseDto>,
    ApiErrorResponse,
    ForgotPasswordRequestDto
  >({
    mutationFn: authService.forgotPassword,
    onError: (error) => {
      logAuthError('forgot password', error)
      toast.error(error.message ?? 'Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại.')
    },
  })
}

export function useResetPassword() {
  return useMutation<
    ApiResponse<ResetPasswordResponseDto>,
    ApiErrorResponse,
    ResetPasswordRequestDto
  >({
    mutationFn: authService.resetPassword,
    onError: (error) => {
      logAuthError('reset password', error)
      toast.error(error.message ?? 'Không thể đặt lại mật khẩu. Vui lòng thử lại.')
    },
  })
}

export function useMeQuery() {
  return useQuery<UserProfileResponse, ApiErrorResponse>({
    queryKey: queryKeys.auth.me,
    queryFn: () => authService.getMe().then((r) => r.data),
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, UpdateProfileRequest>({
    mutationFn: authService.updateMe,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
    onError: (error) => logger.error(error),
  })
}

const SESSION_EXPIRED_MESSAGE = 'Mã xác thực đã hết hạn hoặc không hợp lệ.'
const INVALID_OTP_MESSAGE = 'Mã OTP không đúng.'
const USER_NOT_FOUND_MESSAGE = 'Người dùng không tồn tại.'
const ACCOUNT_INACTIVE_MESSAGE = 'Tài khoản không hoạt động.'

export type Verify2FAErrorKind =
  | 'sessionExpired'
  | 'invalidOtp'
  | 'accountUnavailable'
  | 'network'
  | 'unknown'

export function classifyVerify2FAError(error: ApiErrorResponse): Verify2FAErrorKind {
  if (error.statusCode === 401 && error.message === SESSION_EXPIRED_MESSAGE) return 'sessionExpired'
  if (error.statusCode === 401 && error.message === INVALID_OTP_MESSAGE) return 'invalidOtp'
  if (
    error.statusCode === 401 &&
    (error.message === USER_NOT_FOUND_MESSAGE || error.message === ACCOUNT_INACTIVE_MESSAGE)
  ) {
    return 'accountUnavailable'
  }
  if (error.statusCode === 0 || error.statusCode >= 500) return 'network'
  return 'unknown'
}

export function shouldClearTempTokenOnError(kind: Verify2FAErrorKind): boolean {
  return kind === 'sessionExpired' || kind === 'accountUnavailable'
}

export function isAccountInactiveError(error: ApiErrorResponse): boolean {
  return error.message === ACCOUNT_INACTIVE_MESSAGE
}

export function useVerify2FAMutation() {
  return useMutation<ApiResponse<LoginResponseDto>, ApiErrorResponse, Verify2FARequestDto>({
    mutationFn: authService.verify2FA,
    onError: (error) => {
      // Không toast ở đây — VerifyTwoFactorPage classify (sessionExpired/invalidOtp/
      // accountUnavailable/network/unknown) và tự hiển thị lỗi, tránh trùng lặp
      // toast + inline cho cùng 1 lỗi.
      logger.error(error)
    },
  })
}

const CURRENT_PASSWORD_INCORRECT_MESSAGE = 'Current password is incorrect.'

export function isCurrentPasswordIncorrectError(error: ApiErrorResponse): boolean {
  return error.statusCode === 400 && error.message === CURRENT_PASSWORD_INCORRECT_MESSAGE
}

export function useChangePasswordMutation() {
  return useMutation<ApiResponse<unknown>, ApiErrorResponse, ChangePasswordRequestDto>({
    mutationFn: authService.changePassword,
    onError: (error) => {
      // Không toast ở đây — SecurityPage classify (sai mật khẩu hiện tại →
      // lỗi inline tại field, còn lại → toast chung) tránh trùng lặp hiển thị.
      logger.error(error)
    },
  })
}
