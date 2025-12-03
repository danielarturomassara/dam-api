import { SendTextMessage } from '@communication/application/SendTextMessage.js';
import { HTTP_SUCCESS_CODES } from '@core/domain/type/HttpCodes.js';
import { Phone } from '@core/domain/valueObject/Phone.js';
import { TrimmedString } from '@core/domain/valueObject/TrimmedString.js';
import { dependencyContainer } from '@src/dependencyContainer.js';
import { NextFunction, Request, Response } from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const { message, targetPhoneNumber } = request.body;
    const messageBody = new TrimmedString(message);
    const phone = new Phone(targetPhoneNumber);

    const sendTextMessage = dependencyContainer.get<SendTextMessage>(SendTextMessage);

    await sendTextMessage.run(messageBody, phone);

    response.status(HTTP_SUCCESS_CODES.OK).send(`Message sent successfully to phone ${ phone }.`);
  } catch (error) {
    next(error);
  }
};
