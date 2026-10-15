import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {z} from 'zod';

type FieldErrorBuilder = (issue: {input?: unknown}) => string;

export class FieldSchemas {
  public static optional<OUTPUT> (schema: z.ZodType<OUTPUT>): z.ZodType<OUTPUT | undefined> {
    return z.preprocess((value) => this.treatBlankAsAbsent(value), schema.optional());
  }

  public static providerData<SHAPE extends z.ZodRawShape> (providerName: IDENTITY_PROVIDERS, shape: SHAPE): z.ZodObject<SHAPE> {
    return z.object(shape, {error: this.buildFieldError('providerData', providerName, 'an object')});
  }

  public static requiredNumber (fieldName: string, providerName: IDENTITY_PROVIDERS): z.ZodType<number> {
    return z.preprocess((value) => this.treatBlankAsAbsent(value), z.number({error: this.buildFieldError(fieldName, providerName, 'a number')}));
  }

  public static requiredNumberOrString (fieldName: string, providerName: IDENTITY_PROVIDERS): z.ZodType<number | string> {
    const numberOrString = z.union([z.number(), z.string()], {error: this.buildFieldError(fieldName, providerName, 'a number or a string')});

    return z.preprocess((value) => this.treatBlankAsAbsent(value), numberOrString);
  }

  public static requiredObject<SHAPE extends z.ZodRawShape> (fieldName: string, providerName: IDENTITY_PROVIDERS, shape: SHAPE): z.ZodType<z.output<z.ZodObject<SHAPE>>> {
    return z.preprocess((value) => this.treatBlankAsAbsent(value), z.object(shape, {error: this.buildFieldError(fieldName, providerName, 'an object')}));
  }

  public static requiredString (fieldName: string, providerName: IDENTITY_PROVIDERS): z.ZodType<string> {
    return z.preprocess((value) => this.treatBlankAsAbsent(value), z.string({error: this.buildFieldError(fieldName, providerName, 'a string')}));
  }

  private static buildFieldError (fieldName: string, providerName: IDENTITY_PROVIDERS, typeDescription: string): FieldErrorBuilder {
    return (issue) => {
      if (this.isBlank(issue.input)) {
        return `${fieldName} is required for ${providerName} provider`;
      }

      return `${fieldName} must be ${typeDescription} for ${providerName} provider`;
    };
  }

  private static isBlank (value: unknown): boolean {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  }

  private static treatBlankAsAbsent (value: unknown): unknown {
    return this.isBlank(value) ? undefined : value;
  }
}
