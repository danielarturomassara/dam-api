import {RegisterRequest} from '@account/application/dto/RegisterRequest.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {Phone} from '@core/domain/valueObject/Phone.js';

export class RegisterValidator {
  public static validate (data: RegisterRequest): void {
    this.validateProviderIsPresent(data);
    this.validateProviderData(data);
  }

  private static validateProviderIsPresent (data: RegisterRequest): void {
    if (!data.provider) {
      throw new InvalidArgument({customMessage: 'provider is required'});
    }
  }

  private static validateProviderData (data: RegisterRequest): void {
    switch (data.provider) {
      case IDENTITY_PROVIDERS.APPLE:
        this.validateApple(data);
        break;

      case IDENTITY_PROVIDERS.GOOGLE:
        this.validateGoogle(data);
        break;

      case IDENTITY_PROVIDERS.META:
        this.validateMeta(data);
        break;

      case IDENTITY_PROVIDERS.PASSWORD:
        this.validatePassword(data);
        break;

      case IDENTITY_PROVIDERS.PHONE:
        this.validatePhone(data);
        break;

      default:
        throw new InvalidArgument({customMessage: `Unknown provider: ${data.provider}`});
    }
  }

  private static validateApple (data: RegisterRequest): void {
    this.validateFieldIsPresent(data, 'email');
    this.validateFieldIsPresent(data, 'providerUserId');

    this.validateEmail(data.email!);
  }

  private static validateGoogle (data: RegisterRequest): void {
    this.validateFieldIsPresent(data, 'email');
    this.validateFieldIsPresent(data, 'providerUserId');

    this.validateEmail(data.email!);
  }

  private static validateMeta (data: RegisterRequest): void {
    this.validateFieldIsPresent(data, 'email');
    this.validateFieldIsPresent(data, 'providerUserId');

    this.validateEmail(data.email!);
  }

  private static validatePassword (data: RegisterRequest): void {
    this.validateFieldIsPresent(data, 'email');
    this.validateFieldIsPresent(data, 'password');

    this.validatePasswordFormat(data.password!);
  }

  private static validatePhone (data: RegisterRequest): void {
    this.validateFieldIsPresent(data, 'phone');

    this.validatePhoneFormat(data.phone!);
  }

  private static validateFieldIsPresent (data: RegisterRequest, field: keyof RegisterRequest): void {
    if (!data[field] || data[field].trim() === '') {
      throw new InvalidArgument({customMessage: `${field} is required for ${data.provider} provider`});
    }
  }

  private static validateEmail (email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new InvalidArgument({value: email, valueObjectName: 'Email'});
    }
  }

  private static validatePasswordFormat (password: string): void {
    if (password.length < 8) {
      throw new InvalidArgument({customMessage: 'Password must be at least 8 characters long'});
    }
  }

  private static validatePhoneFormat (phone: string): void {
    Phone.fromPrimitives(phone);
  }
}
