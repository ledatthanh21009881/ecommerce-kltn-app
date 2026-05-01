/**
 * Params for the auth stack (AppNavigator screens when logged out).
 * Shared so Forgot / VerifyOTP / ResetPassword get correct navigate() typings.
 */
export type AuthStackParamList = {
  Login: undefined
  ForgotPassword: undefined
  VerifyOTPScreen: { email: string }
  ResetPassword: { email: string; otp: string }
}
