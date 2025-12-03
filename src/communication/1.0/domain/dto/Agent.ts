import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';

export interface AgentPrimitives {
  id: number;
  name: string;
}

export class Agent {
  public id: number;
  public name: TrimmedString;

  public constructor (primitives: AgentPrimitives) {
    this.id = primitives.id;
    this.name = new TrimmedString(primitives.name);
  }

  public toPrimitives (): AgentPrimitives {
    return {
      id: this.id,
      name: this.name.toPrimitives()
    };
  }
}
