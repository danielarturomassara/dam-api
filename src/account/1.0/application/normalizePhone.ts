import {formatE164} from '@core/application/stringFormatter.js';

export const normalizePhone = (phone: string): string => {
  const trimmedPhone = phone.trim();

  if (trimmedPhone.startsWith('+') || trimmedPhone.startsWith('00')) {
    return formatE164(trimmedPhone);
  }

  return trimmedPhone;
};
