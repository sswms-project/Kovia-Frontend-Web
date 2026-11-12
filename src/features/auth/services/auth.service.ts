import { axiosClient } from '@/lib/axios'
import { API_ENDPOINTS } from '@/routes/api-endpoints'
import type { ApiResponse } from '@/types/api'
import type {
  ChangePasswordRequestDto,
  CaptchaChallengeResponse,
  ForgotPasswordRequestDto,
  ForgotPasswordResponseDto,
  LoginRequestDto,
  LoginResponseDto,
  LoginSessionSummary,
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

export const authService = {
  login: (body: LoginRequestDto) =>
    axiosClient
      .post<ApiResponse<LoginResponseDto>>(API_ENDPOINTS.auth.login, body)
      .then((r) => r.data),

  completeSession: (ticket: string, replaceSessionId: string | null) =>
    axiosClient
      .post<
        ApiResponse<LoginResponseDto>
      >(API_ENDPOINTS.auth.completeSession, { ticket, replaceSessionId })
      .then((r) => r.data),

  listSessions: (signal: AbortSignal) =>
    axiosClient
      .get<ApiResponse<LoginSessionSummary[]>>(API_ENDPOINTS.auth.sessions, { signal })
      .then((r) => r.data.data),

  revokeSession: (id: string | null) =>
    axiosClient.delete(id ? API_ENDPOINTS.auth.session(id) : API_ENDPOINTS.auth.sessions),

  createCaptcha: () =>
    axiosClient
      .post<ApiResponse<CaptchaChallengeResponse>>(API_ENDPOINTS.auth.captchaChallenge)
      .then((r) => r.data),

  registerTenant: (body: RegisterRequestDto) =>
    axiosClient
      .post<ApiResponse<RegisterResponseDto>>(API_ENDPOINTS.auth.register, body)
      .then((r) => r.data),

  resendVerification: (body: ResendVerificationRequestDto) =>
    axiosClient
      .post<ApiResponse<unknown>>(API_ENDPOINTS.auth.resendVerification, body)
      .then((r) => r.data),

  verifyEmail: (token: string) =>
    axiosClient
      .get<ApiResponse<VerifyEmailResponseDto>>(API_ENDPOINTS.auth.verifyEmail, {
        params: { token },
      })
      .then((r) => r.data),

  forgotPassword: (body: ForgotPasswordRequestDto) =>
    axiosClient
      .post<ApiResponse<ForgotPasswordResponseDto>>(API_ENDPOINTS.auth.forgotPassword, body)
      .then((r) => r.data),

  resetPassword: (body: ResetPasswordRequestDto) =>
    axiosClient
      .post<ApiResponse<ResetPasswordResponseDto>>(API_ENDPOINTS.auth.resetPassword, body)
      .then((r) => r.data),

  getMe: () =>
    axiosClient.get<ApiResponse<UserProfileResponse>>(API_ENDPOINTS.auth.me).then((r) => r.data),

  updateMe: (body: UpdateProfileRequest) =>
    axiosClient.put<ApiResponse<unknown>>(API_ENDPOINTS.auth.me, body).then((r) => r.data),

  verify2FA: (body: Verify2FARequestDto) =>
    axiosClient
      .post<ApiResponse<LoginResponseDto>>(API_ENDPOINTS.auth.verify2fa, body)
      .then((r) => r.data),

  changePassword: (body: ChangePasswordRequestDto) =>
    axiosClient
      .put<ApiResponse<unknown>>(API_ENDPOINTS.auth.changePassword, body)
      .then((r) => r.data),

  logout: () =>
    axiosClient.post<ApiResponse<unknown>>(API_ENDPOINTS.auth.logout).then((r) => r.data),
}
