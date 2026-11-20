import {normalizeClientAddress} from '@core/application/normalizeClientAddress.js';
import {ServerError} from '@core/domain/error/ServerError.js';
import fc from 'fast-check';
import {describe, expect, it} from 'vitest';

describe('normalizeClientAddress', (): void => {
  it('keeps every IPv4 address as itself', (): void => {
    fc.assert(fc.property(fc.ipV4(), (address: string): void => {
      expect(normalizeClientAddress(address)).toBe(address);
    }));
  });

  it('counts every IPv4 address mapped into IPv6 as the IPv4 address', (): void => {
    fc.assert(fc.property(fc.ipV4(), (address: string): void => {
      expect(normalizeClientAddress(`::ffff:${address}`)).toBe(address);
    }));
  });

  it('gives two IPv6 addresses of one /64 network the same key', (): void => {
    const hexGroup = fc.integer({max: 0xffff, min: 0}).map((group: number): string => group.toString(16));
    const groupList = (length: number): fc.Arbitrary<Array<string>> => fc.array(hexGroup, {maxLength: length, minLength: length});

    fc.assert(fc.property(groupList(4), groupList(4), groupList(4), (networkGroups: Array<string>, firstHost: Array<string>, secondHost: Array<string>): void => {
      fc.pre(networkGroups.join(':') !== '0:0:0:0');

      const firstKey = normalizeClientAddress([...networkGroups, ...firstHost].join(':'));

      expect(firstKey).toBe(normalizeClientAddress([...networkGroups, ...secondHost].join(':')));
      expect(firstKey).toBe(`${networkGroups.join(':')}::/64`);
    }));
  });

  it.each([
    ['2001:db8:1:2:aaaa:bbbb:cccc:dddd', '2001:db8:1:2::/64'],
    ['2001:DB8::1', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['fe80::1%eth0', 'fe80:0:0:0::/64'],
    ['::ffff:7f00:1', '127.0.0.1'],
    ['64:ff9b::192.0.2.33', '64:ff9b:0:0::/64']
  ])('normalizes %s to %s', (address: string, expectedKey: string): void => {
    expect(normalizeClientAddress(address)).toBe(expectedKey);
  });

  it('gives two different /64 networks different keys', (): void => {
    expect(normalizeClientAddress('2001:db8:1:2::1')).not.toBe(normalizeClientAddress('2001:db8:1:3::1'));
  });

  it.each([
    ['::FFFF:192.0.2.9', '192.0.2.9'],
    ['0:0:0:0:0:ffff:c000:209', '192.0.2.9']
  ])('counts the mapped form %s as the IPv4 address %s', (address: string, expectedKey: string): void => {
    expect(normalizeClientAddress(address)).toBe(expectedKey);
  });

  it.each([
    ['2001:db8:1:2:0:ffff:102:304', '2001:db8:1:2::/64'],
    ['1::ffff:1.2.3.4', '1:0:0:0::/64'],
    ['::ffff:0:1.2.3.4', '0:0:0:0::/64'],
    ['::1.2.3.4', '0:0:0:0::/64']
  ])('does not mistake %s for a mapped IPv4 address', (address: string, expectedKey: string): void => {
    expect(normalizeClientAddress(address)).toBe(expectedKey);
  });

  it.each(['1.2.3.4%eth0', 'fe80::1%', '2001:db8:1:2:3:4:5:6%a%b', '[::1]', ' 192.0.2.1'])('fails loudly on the malformed address %s', (address: string): void => {
    expect((): unknown => normalizeClientAddress(address)).toThrow(new ServerError('The client address of the request is not available.'));
  });

  it.each([undefined, '', 'not-an-address', '300.1.1.1'])('fails loudly on %s', (address: string | undefined): void => {
    expect((): unknown => normalizeClientAddress(address)).toThrow(new ServerError('The client address of the request is not available.'));
  });
});
