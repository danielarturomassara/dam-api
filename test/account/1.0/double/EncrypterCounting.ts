import {Encrypter} from '@account/domain/Encrypter.js';

export class EncrypterCounting implements Encrypter {
  public compareCallCount: number = 0;
  public encryptCallCount: number = 0;

  public async compare (plainText: string, hashedText: string): Promise<boolean> {
    this.compareCallCount += 1;

    return hashedText === `hashed:${plainText}`;
  }

  public async encrypt (plainText: string): Promise<string> {
    this.encryptCallCount += 1;

    return `hashed:${plainText}`;
  }

  public getComputationCount (): number {
    return this.compareCallCount + this.encryptCallCount;
  }
}
