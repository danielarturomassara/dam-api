import {Conflict} from '@core/domain/error/Conflict.js';

export type DuplicateContactResource = 'email' | 'phone';

export class DuplicateContact extends Conflict {
  public constructor (contactResource: DuplicateContactResource) {
    super(contactResource);
  }
}
