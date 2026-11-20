import {BaseIdentity, BaseIdentityPrimitives} from '@account/domain/entity/BaseIdentity.js';
import {VerificationNotProven} from '@account/domain/error/VerificationNotProven.js';
import {IDENTITY_PROVIDERS} from '@account/domain/IdentityProviders.js';
import {IDENTITY_VERIFICATION_MODES} from '@account/domain/IdentityVerificationModes.js';
import {TimestampedEntityPrimitives} from '@core/domain/entity/TimestampedEntity.js';
import {TrimmedString} from '@core/domain/valueObject/TrimmedString.js';
import {createHash, timingSafeEqual} from 'crypto';

const VERIFICATION_LIFETIME_MILLISECONDS = 86_400_000;

export type CreateIdentityProviderPasswordPrimitives = Omit<IdentityProviderPasswordPrimitives, keyof TimestampedEntityPrimitives>;

export interface IdentityProviderPasswordPrimitives extends BaseIdentityPrimitives {
  hash: string;
  password: string;
  provider: IDENTITY_PROVIDERS.PASSWORD;
}

export class IdentityProviderPassword extends BaseIdentity {
  public readonly hash: TrimmedString;
  public readonly password: TrimmedString;

  public static create (primitives: CreateIdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword({
      ...super.buildIdentity(primitives),
      hash: primitives.hash,
      password: primitives.password,
      provider: IDENTITY_PROVIDERS.PASSWORD
    });
  }

  public static fromPrimitives (primitives: IdentityProviderPasswordPrimitives): IdentityProviderPassword {
    return new IdentityProviderPassword(primitives);
  }

  public getVerificationMode (): IDENTITY_VERIFICATION_MODES {
    return IDENTITY_VERIFICATION_MODES.BY_LINK;
  }

  public override toPrimitives (): IdentityProviderPasswordPrimitives {
    return {
      ...super.toPrimitives(),
      hash: this.hash.toPrimitives(),
      password: this.password.toPrimitives(),
      provider: IDENTITY_PROVIDERS.PASSWORD
    };
  }

  public verifyWithHash (hash: string, now: Date): void {
    if (this.isVerified() || this.isVerificationExpired(now) || !this.matchesHash(hash)) {
      throw new VerificationNotProven();
    }

    this.verify();
  }

  private constructor (primitives: IdentityProviderPasswordPrimitives) {
    super(primitives);

    this.hash = TrimmedString.fromPrimitives(primitives.hash);
    this.password = TrimmedString.fromPrimitives(primitives.password);
  }

  private isVerificationExpired (now: Date): boolean {
    return now.getTime() - this.createdAt.getTime() >= VERIFICATION_LIFETIME_MILLISECONDS;
  }

  private matchesHash (hash: string): boolean {
    const givenDigest = createHash('sha256').update(hash, 'utf8').digest();
    const ownDigest = createHash('sha256').update(this.hash.toPrimitives(), 'utf8').digest();

    return timingSafeEqual(givenDigest, ownDigest);
  }
}
