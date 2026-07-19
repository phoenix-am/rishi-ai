/**
 * Interface representing an email dispatch provider.
 */
export interface IEmailProvider {
  /**
   * Dispatches a verification OTP code to the target email address.
   *
   * @param email - Target recipient email address
   * @param code - The short-lived numeric verification code
   */
  sendOtp(email: string, code: string): Promise<void>;
}
