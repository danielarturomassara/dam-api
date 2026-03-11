import {Encrypter} from '@account/domain/Encrypter.js';
import * as bcrypt from 'bcrypt';
import {injectable} from 'inversify';

@injectable()
export class EncrypterBcrypt implements Encrypter {
  public async compare (plainText: string, hashedText: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hashedText);
  }

  public async encrypt (plainText: string): Promise<string> {
    const salt = await this.genSalt();

    return await bcrypt.hash(plainText, salt);
  }

  private async genSalt (): Promise<string> {
    const saltRounds = 10;

    return await bcrypt.genSalt(saltRounds);
  }
}
