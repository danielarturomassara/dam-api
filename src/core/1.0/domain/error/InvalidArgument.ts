export interface InvalidArgumentData {
  customMessage?: string;
  value?: unknown;
  valueObjectName?: string;
}

export class InvalidArgument extends Error {
  public constructor (data: InvalidArgumentData) {
    super();

    this.name = this.constructor.name;

    this.message = data.customMessage ?? `<${data.valueObjectName}> does not allow the value <${data.value}>`;
  }
}
