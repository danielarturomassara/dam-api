import { Subscribe } from '@communication/application/Subscribe.js';
import { HubPayload } from '@communication/domain/dto/HubPayload.js';
import { HTTP_SUCCESS_CODES } from '@core/domain/type/HttpCodes.js';
import { dependencyContainer } from '@src/dependencyContainer.js';
import { NextFunction, Request, Response } from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const hubMode = request.query['hub.mode'];
    const hubChallenge = request.query['hub.challenge'];
    const hubToken = request.query['hub.verify_token'];

    const payload = new HubPayload({
      challenge: hubChallenge as string,
      mode: hubMode as string,
      verifyToken: hubToken as string
    });

    const subscribe = dependencyContainer.get<Subscribe>(Subscribe);

    const result = await subscribe.run(payload);

    response.status(HTTP_SUCCESS_CODES.OK).send(result.toPrimitives());
  } catch (error) {
    next(error);
  }
};
