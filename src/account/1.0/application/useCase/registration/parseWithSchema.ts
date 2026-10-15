import {InvalidArgument} from '@core/domain/error/InvalidArgument.js';
import {z} from 'zod';

export const parseWithSchema = <OUTPUT> (schema: z.ZodType<OUTPUT>, rawData: unknown): OUTPUT => {
  const parseResult = schema.safeParse(rawData);

  if (!parseResult.success) {
    throw new InvalidArgument({customMessage: parseResult.error.issues[0].message});
  }

  return parseResult.data;
};
