import {ServerError} from '@core/domain/error/ServerError.js';
import {isIPv4, isIPv6} from 'net';

const IPV6_GROUP_COUNT = 8;

const NETWORK_GROUP_COUNT = 4;

const MAPPED_PREFIX_GROUP_LIST = [0, 0, 0, 0, 0, 0xffff];

const HEXADECIMAL_RADIX = 16;

const BITS_PER_BYTE = 8;

const BYTE_MASK = 0xff;

const GROUP_MASK = 0xffff;

const toGroupList = (groupsText: string): Array<number> => {
  return groupsText === '' ? [] : groupsText.split(':').map((groupText: string): number => Number.parseInt(groupText, HEXADECIMAL_RADIX));
};

const toHexadecimal = (group: number): string => group.toString(HEXADECIMAL_RADIX);

const replaceDottedTail = (address: string): string => {
  const tailStartIndex = address.lastIndexOf(':') + 1;
  const tail = address.slice(tailStartIndex);

  if (!isIPv4(tail)) {
    return address;
  }

  const tailValue = tail.split('.').reduce((value: number, byteText: string): number => value * (BYTE_MASK + 1) + Number(byteText), 0);

  return `${address.slice(0, tailStartIndex)}${toHexadecimal(Math.floor(tailValue / (GROUP_MASK + 1)))}:${toHexadecimal(tailValue % (GROUP_MASK + 1))}`;
};

const expandGroups = (address: string): Array<number> => {
  const hexadecimalAddress = replaceDottedTail(address);
  const compressionIndex = hexadecimalAddress.indexOf('::');

  if (compressionIndex < 0) {
    return toGroupList(hexadecimalAddress);
  }

  const headGroupList = toGroupList(hexadecimalAddress.slice(0, compressionIndex));
  const tailGroupList = toGroupList(hexadecimalAddress.slice(compressionIndex + 2));
  const zeroGroupList = new Array<number>(IPV6_GROUP_COUNT - headGroupList.length - tailGroupList.length).fill(0);

  return [...headGroupList, ...zeroGroupList, ...tailGroupList];
};

const isMappedIpv4 = (groupList: Array<number>): boolean => {
  return MAPPED_PREFIX_GROUP_LIST.every((prefixGroup: number, groupIndex: number): boolean => groupList[groupIndex] === prefixGroup);
};

const toDottedAddress = (groupList: Array<number>): string => {
  return groupList.flatMap((group: number): Array<number> => [group >> BITS_PER_BYTE, group & BYTE_MASK]).join('.');
};

const removeZoneIdentifier = (address: string): string => {
  const zoneIndex = address.indexOf('%');

  return zoneIndex < 0 ? address : address.slice(0, zoneIndex);
};

export const normalizeClientAddress = (clientAddress: string | undefined): string => {
  if (clientAddress === undefined || (!isIPv4(clientAddress) && !isIPv6(clientAddress))) {
    throw new ServerError('The client address of the request is not available.');
  }

  if (isIPv4(clientAddress)) {
    return clientAddress;
  }

  const groupList = expandGroups(removeZoneIdentifier(clientAddress));

  if (isMappedIpv4(groupList)) {
    return toDottedAddress(groupList.slice(MAPPED_PREFIX_GROUP_LIST.length));
  }

  return `${groupList.slice(0, NETWORK_GROUP_COUNT).map(toHexadecimal).join(':')}::/64`;
};
