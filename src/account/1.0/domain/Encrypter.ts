export interface Encrypter {
  compare (plainText: string, hashedText: string): Promise<boolean>
  encrypt (plainText: string): Promise<string>
}

export const ENCRYPTER = Symbol.for('Encrypter');
