import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export interface VerificationMessageSender {
  notifyEmailAlreadyRegistered (email: Email): Promise<void>;
  notifyPhoneAlreadyRegistered (phone: Phone): Promise<void>;
  sendEmailVerification (email: Email, hash: string): Promise<void>;
  sendPhoneVerification (phone: Phone, code: string): Promise<void>;
}

export const VERIFICATION_MESSAGE_SENDER = Symbol.for('VerificationMessageSender');
