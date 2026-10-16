import {Nullable} from '@core/domain/type/Nullable.js';

// Records the subset of the Express response surface the handlers under test touch, with Express
// semantics: json() writes a body and ends the response, end() ends it with whatever was written
// before. Tests cast it with `as unknown as Response`; a method the production code calls but the
// recorder lacks fails the test loudly instead of passing silently.
export class ResponseRecorder {
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

  public status (statusCode: number): ResponseRecorder {
    this.statusCode = statusCode;

    return this;
  }
}
