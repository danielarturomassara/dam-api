import {Names} from '@core/domain/valueObject/Names.js';

export const formatFullname = (names: Names, familyFirst: boolean = false): string => {
  if (familyFirst) {
    return `${names.family.toPrimitives().toLocaleUpperCase()}, ${names.given.toPrimitives()}`;
  }

  return `${names.given.toPrimitives()} ${names.family.toPrimitives()}`;
};

export const formatInitials = (names: Names, separator: string = ''): string => {
  const getInitials = (initials: string, name: string): string => {
    return `${initials}${name.charAt(0).toLocaleUpperCase()}${separator}`;
  };

  const givenInitials = names.given.toPrimitives().split(' ').reduce(getInitials, '');
  const familyInitials = names.family.toPrimitives().split(' ').reduce(getInitials, '');

  return `${givenInitials}${familyInitials}`.trim();
};
