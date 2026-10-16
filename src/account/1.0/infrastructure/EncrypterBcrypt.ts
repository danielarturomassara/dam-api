import {Encrypter} from '@account/domain/Encrypter.js';
import bcrypt from 'bcrypt';
import {injectable} from 'inversify';

const SALT_ROUNDS = 10;

@injectable()
export class EncrypterBcrypt implements Encrypter {
  public constructor () {}

  public async compare (plainText: string, hashedText: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashedText);
  }

  public async encrypt (plainText: string): Promise<string> {
    return bcrypt.hash(plainText, SALT_ROUNDS);
  }
}
