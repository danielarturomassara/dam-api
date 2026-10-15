import {Names} from '@core/domain/valueObject/Names.js';

const NON_PHONE_CHARACTERS_REG_EXP = /[\s().-]/g;

const getInitials = (name: string, separator: string): string => {
  return name
    .split(' ')
    .map((namePart) => `${namePart.charAt(0).toLocaleUpperCase()}${separator}`)
    .join('');
};

export const formatFullname = (names: Names, familyFirst: boolean = false): string => {
  const given = names.given.toPrimitives();
  const family = names.family.toPrimitives();

  if (familyFirst) {
    return `${family.toLocaleUpperCase()}, ${given}`;
  }

  return `${given} ${family}`;
};

export const formatInitials = (names: Names, separator: string = ''): string => {
  const givenInitials = getInitials(names.given.toPrimitives(), separator);
  const familyInitials = getInitials(names.family.toPrimitives(), separator);

  return `${givenInitials}${familyInitials}`.trim();
};

export const formatEmail = (email: string): string => {
  return email.toLowerCase();
};

export const formatE164 = (phone: string): string => {
  const digits = phone.replace(NON_PHONE_CHARACTERS_REG_EXP, '');

  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith('+')) {
    return digits;
  }

  return `+${digits}`;
};
