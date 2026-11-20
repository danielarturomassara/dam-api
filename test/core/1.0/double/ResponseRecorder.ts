import {Nullable} from '@core/domain/type/Nullable.js';

export class ResponseRecorder {
  public readonly headers: Record<string, string> = {};
  public isEnded: boolean = false;
  public jsonBody: unknown = undefined;
  public statusCode: Nullable<number> = null;

  public end (): ResponseRecorder {
    this.isEnded = true;

    return this;
  }

  public json (body: unknown): ResponseRecorder {
    this.isEnded = true;
    this.jsonBody = body;

    return this;
  }

  public setHeader (headerName: string, headerValue: string): ResponseRecorder {
    this.headers[headerName] = headerValue;

    return this;
  }

  public status (statusCode: number): ResponseRecorder {
    this.statusCode = statusCode;

    return this;
  }
}
