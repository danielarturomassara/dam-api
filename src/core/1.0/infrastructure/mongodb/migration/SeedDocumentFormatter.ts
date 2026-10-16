import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';

const TIMESTAMP_FIELD_NAME_LIST = ['created_at', 'updated_at'];

const INTEGER_TEXT_REG_EXP = /^-?\d+$/;

export class SeedDocumentFormatter {
  public static format (document: Record<string, unknown>): Record<string, unknown> {
    for (const fieldName of Object.keys(document)) {
      document[fieldName] = this.formatField(fieldName, document[fieldName]);
    }

    return document;
  }

  private static formatField (fieldName: string, value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((element: unknown) => this.formatField(fieldName, element));
    }

    if (typeof value !== 'object') {
      return value;
    }

    return this.formatObjectField(fieldName, value);
  }

  private static formatObjectField (fieldName: string, value: object): unknown {
    if (TIMESTAMP_FIELD_NAME_LIST.includes(fieldName) && Object.hasOwn(value, '$numberLong')) {
      return this.toDate(this.toMilliseconds(Reflect.get(value, '$numberLong')));
    }

    if (Object.hasOwn(value, '$date')) {
      return this.toDate(Reflect.get(value, '$date'));
    }

    return this.format(this.toRecord(value));
  }

  private static toDate (value: unknown): Date {
    const date = typeof value === 'number' || typeof value === 'string' ? new Date(value) : new Date(Number.NaN);

    if (Number.isNaN(date.getTime())) {
      throw new InvalidArgument({value, valueObjectName: 'SeedDate'});
    }

    return date;
  }

  private static toMilliseconds (value: unknown): unknown {
    if (typeof value === 'string' && INTEGER_TEXT_REG_EXP.test(value)) {
      return Number(value);
    }

    return typeof value === 'number' ? value : Number.NaN;
  }

  private static toRecord (value: object): Record<string, unknown> {
    const record: Record<string, unknown> = {};

    for (const [fieldName, fieldValue] of Object.entries(value)) {
      record[fieldName] = fieldValue;
    }

    return record;
  }
}
