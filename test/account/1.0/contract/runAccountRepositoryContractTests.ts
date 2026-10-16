import {AccountRepository} from '@account/domain/AccountRepository.js';
import {Account} from '@account/domain/entity/Account.js';
import {DuplicateContact} from '@account/domain/error/DuplicateContact.js';
import {NotFound} from '@core/domain/error/NotFound.js';
import {Email} from '@core/domain/valueObject/Email.js';
import {Phone} from '@core/domain/valueObject/Phone.js';
import {Uuid} from '@core/domain/valueObject/Uuid.js';
import {expect, it} from 'vitest';

import {buildEmailAccount, buildGoogleAccount, buildGoogleIdentity, buildPhoneAccount} from '../double/accountFixtures.js';

// The AccountRepository port contract (spec/approved/account.spec.md §3.5 and §4.6). Every adapter of the
// port runs this suite; passing it is the definition of a correct adapter.

export interface AccountRepositoryContractContext {
  buildRepository: () => Promise<AccountRepository>;
}

export const runAccountRepositoryContractTests = (context: AccountRepositoryContractContext): void => {
  it('finds a created account by its primary email', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = buildEmailAccount('someone@example.com');

    await repository.create(account);

    const foundAccount = await repository.findByEmail(Email.fromPrimitives('someone@example.com'));

    expect(foundAccount?.toPrimitives()).toStrictEqual(account.toPrimitives());
  });

  it('finds an account by an oauth identity email even when it is not the primary email', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = Account.create({identity: buildGoogleIdentity('identity.only@gmail.com'), primaryEmail: null, primaryPhone: null});

    await repository.create(account);

    const foundAccount = await repository.findByEmail(Email.fromPrimitives('identity.only@gmail.com'));

    expect(foundAccount?.toPrimitives()).toStrictEqual(account.toPrimitives());
  });

  it('returns null for an unknown email', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.findByEmail(Email.fromPrimitives('nobody@example.com'))).resolves.toBeNull();
  });

  it('finds a created account by its primary phone', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = buildPhoneAccount('+34600123456');

    await repository.create(account);

    const foundAccount = await repository.findByPhone(Phone.fromPrimitives('+34600123456'));

    expect(foundAccount?.toPrimitives()).toStrictEqual(account.toPrimitives());
  });

  it('returns null for an unknown phone', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.findByPhone(Phone.fromPrimitives('+34999999999'))).resolves.toBeNull();
  });

  it('finds a created account by its id and returns null for an unknown one', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = buildEmailAccount('someone@example.com');

    await repository.create(account);

    expect((await repository.findById(account.id))?.toPrimitives()).toStrictEqual(account.toPrimitives());
    await expect(repository.findById(Uuid.create())).resolves.toBeNull();
  });

  it('updates an account in place', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = buildEmailAccount('someone@example.com');

    await repository.create(account);

    const disabledAt = new Date();
    const updatedAccount = Account.fromPrimitives({...account.toPrimitives(), disabledAt});

    await repository.update(updatedAccount);

    expect((await repository.findById(account.id))?.toPrimitives().disabledAt).toStrictEqual(disabledAt);
  });

  it('rejects an update for an account that was never created', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await expect(repository.update(buildEmailAccount('nobody@example.com'))).rejects.toThrow(new NotFound('Account'));
  });

  it('deletes an account', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const account = buildEmailAccount('someone@example.com');

    await repository.create(account);
    await repository.delete(account.id);

    await expect(repository.findById(account.id)).resolves.toBeNull();
  });

  it('rejects a duplicate primary email as a DuplicateContact', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.create(buildEmailAccount('someone@example.com'));

    await expect(repository.create(buildEmailAccount('someone@example.com'))).rejects.toThrow(DuplicateContact);
    await expect(repository.create(buildEmailAccount('someone@example.com'))).rejects.toThrow('Conflict: email.');
  });

  it('rejects a duplicate primary phone as a DuplicateContact', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.create(buildPhoneAccount('+34600123456'));

    await expect(repository.create(buildPhoneAccount('+34600123456'))).rejects.toThrow(DuplicateContact);
    await expect(repository.create(buildPhoneAccount('+34600123456'))).rejects.toThrow('Conflict: phone.');
  });

  it('rejects a duplicate oauth identity email even when neither account has a primary email', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const buildIdentityOnlyAccount = (): Account => Account.create({identity: buildGoogleIdentity('identity.only@gmail.com'), primaryEmail: null, primaryPhone: null});

    await repository.create(buildIdentityOnlyAccount());

    await expect(repository.create(buildIdentityOnlyAccount())).rejects.toThrow(DuplicateContact);
    await expect(repository.create(buildIdentityOnlyAccount())).rejects.toThrow('Conflict: email.');
  });

  it('rejects an oauth identity email that another account holds as its primary email', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.create(buildEmailAccount('shared@example.com'));

    const identityOnlyAccount = Account.create({identity: buildGoogleIdentity('shared@example.com'), primaryEmail: null, primaryPhone: null});

    await expect(repository.create(identityOnlyAccount)).rejects.toThrow(DuplicateContact);
    await expect(repository.create(identityOnlyAccount)).rejects.toThrow('Conflict: email.');
  });

  it('rejects a primary email that another account holds as an oauth identity email', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.create(Account.create({identity: buildGoogleIdentity('shared@example.com'), primaryEmail: null, primaryPhone: null}));

    await expect(repository.create(buildEmailAccount('shared@example.com'))).rejects.toThrow(DuplicateContact);
  });

  it('constrains only present contacts', async (): Promise<void> => {
    const repository = await context.buildRepository();

    await repository.create(buildPhoneAccount('+34600123456'));
    await repository.create(buildPhoneAccount('+34600123457'));
    await repository.create(buildEmailAccount('someone@example.com'));
    await repository.create(buildGoogleAccount('someone.else@example.com'));

    await expect(repository.findByPhone(Phone.fromPrimitives('+34600123457'))).resolves.not.toBeNull();
    await expect(repository.findByEmail(Email.fromPrimitives('someone.else@example.com'))).resolves.not.toBeNull();
  });

  it('rejects an update that steals another account\'s primary email', async (): Promise<void> => {
    const repository = await context.buildRepository();
    const firstAccount = buildEmailAccount('someone@example.com');
    const secondAccount = buildEmailAccount('someone.else@example.com');

    await repository.create(firstAccount);
    await repository.create(secondAccount);

    const stolenEmailAccount = Account.fromPrimitives({...secondAccount.toPrimitives(), primaryEmail: 'someone@example.com'});

    await expect(repository.update(stolenEmailAccount)).rejects.toThrow(DuplicateContact);
  });
};
