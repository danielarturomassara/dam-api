import {Encrypter} from '@account/domain/Encrypter.js';

export class EncrypterFake implements Encrypter {
  public static readonly HASH_PREFIX = 'hashed:';

  public encryptCallCount: number = 0;

  public async compare (plainText: string, hashedText: string): Promise<boolean> {
    return hashedText === `${EncrypterFake.HASH_PREFIX}${plainText}`;
  }

  public async encrypt (plainText: string): Promise<string> {
    this.encryptCallCount += 1;

    return `${EncrypterFake.HASH_PREFIX}${plainText}`;
  }
}
