import {RevocableToken, TokenRevocationRepository} from '@account/domain/TokenRevocationRepository.js';
import {Nullable} from '@core/domain/type/Nullable.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';

export interface StoredTokenCutoff {
  accountId: string;
  expiresAt: Date;
  issuedUntil: Date;
}

export interface StoredTokenRevocation {
  expiresAt: Date;
  tokenId: string;
}

export class TokenRevocationRepositoryInMemory implements TokenRevocationRepository {
  public readonly cutoffList: Array<StoredTokenCutoff> = [];
  public nextError: Nullable<Error> = null;
  public readonly revokedTokenList: Array<StoredTokenRevocation> = [];
  public readonly writeOutcomeList: Array<Nullable<Error>> = [];

  public async isRevoked (revocableToken: RevocableToken): Promise<boolean> {
    this.throwNextError();

    const isTokenRevoked = this.revokedTokenList.some((storedRevocation) => storedRevocation.tokenId === revocableToken.tokenId.toPrimitives());
    const storedCutoff = this.findCutoff(revocableToken.accountId);

    return isTokenRevoked || (storedCutoff !== undefined && revocableToken.issuedAt.getTime() <= storedCutoff.issuedUntil.getTime());
  }

  public async revokeToken (tokenId: Uuid, expiresAt: Date): Promise<void> {
    this.throwNextError();
    this.throwScriptedWriteError();

    if (this.revokedTokenList.some((storedRevocation) => storedRevocation.tokenId === tokenId.toPrimitives())) {
      return;
    }

    this.revokedTokenList.push({expiresAt, tokenId: tokenId.toPrimitives()});
  }

  public async revokeTokensOfAccount (accountId: Uuid, issuedUntil: Date, expiresAt: Date): Promise<void> {
    this.throwNextError();
    this.throwScriptedWriteError();

    const storedCutoff = this.findCutoff(accountId);

    if (!storedCutoff) {
      this.cutoffList.push({accountId: accountId.toPrimitives(), expiresAt, issuedUntil});

      return;
    }

    storedCutoff.expiresAt = new Date(Math.max(storedCutoff.expiresAt.getTime(), expiresAt.getTime()));
    storedCutoff.issuedUntil = new Date(Math.max(storedCutoff.issuedUntil.getTime(), issuedUntil.getTime()));
  }

  private findCutoff (accountId: Uuid): StoredTokenCutoff | undefined {
    return this.cutoffList.find((storedCutoff) => storedCutoff.accountId === accountId.toPrimitives());
  }

  private throwNextError (): void {
    if (this.nextError) {
      throw this.nextError;
    }
  }

  private throwScriptedWriteError (): void {
    const scriptedWriteError = this.writeOutcomeList.shift();

    if (scriptedWriteError) {
      throw scriptedWriteError;
    }
  }
}
