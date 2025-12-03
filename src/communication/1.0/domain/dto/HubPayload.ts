import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface HubPayloadPrimitives {
  challenge: string;
  mode: string;
  verifyToken: string;
}

export class HubPayload {
  public challenge: TrimmedString;
  public mode: TrimmedString;
  public verifyToken: TrimmedString;

  public constructor (primitives: HubPayloadPrimitives) {
    this.challenge = new TrimmedString(primitives.challenge);
    this.mode = new TrimmedString(primitives.mode);
    this.verifyToken = new TrimmedString(primitives.verifyToken);
  }

  public toPrimitives (): HubPayloadPrimitives {
    return {
      challenge: this.challenge.toPrimitives(),
      mode: this.mode.toPrimitives(),
      verifyToken: this.verifyToken.toPrimitives()
    };
  }
}
