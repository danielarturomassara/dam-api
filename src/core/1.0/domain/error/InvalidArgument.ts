export interface InvalidArgumentData {
  customMessage?: string;
  value?: unknown;
  valueObjectName?: string;
}

export class InvalidArgument extends Error {
  public constructor (data: InvalidArgumentData) {
    if (data.customMessage) {
      super(data.customMessage);

      return;
    }

    super(`<${data.valueObjectName}> does not allow the value <${data.value}>`);
  }
}
