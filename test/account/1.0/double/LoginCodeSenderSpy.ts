import {LoginCodeSender} from '@account/domain/LoginCodeSender.js';
import {VerificationCode} from '@account/domain/valueObject/VerificationCode.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export class LoginCodeSenderSpy implements LoginCodeSender {
  public nextError: Nullable<Error> = null;
  public readonly sentList: Array<{code: string; phone: string}> = [];

  public async sendPhoneLoginCode (phone: Phone, code: VerificationCode): Promise<void> {
    if (this.nextError) {
      throw this.nextError;
    }

    this.sentList.push({code: code.toPrimitives(), phone: phone.toPrimitives()});
  }
}
