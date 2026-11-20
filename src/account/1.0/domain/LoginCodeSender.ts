import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export interface LoginCodeSender {
  sendPhoneLoginCode (phone: Phone, code: VerificationCode): Promise<void>;
}

export const LOGIN_CODE_SENDER = Symbol.for('LoginCodeSender');
