import { Encrypter } from '@core/domain/Encrypter.js';
import * as bcrypt from 'bcrypt';
import { injectable } from 'inversify';

@injectable()
export class BcryptEncrypter implements Encrypter {
  public async compare (plainText: string, hashedText: string): Promise<boolean> {
    const passwordsMatch = await bcrypt.compare(plainText, hashedText);

    return passwordsMatch;
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
