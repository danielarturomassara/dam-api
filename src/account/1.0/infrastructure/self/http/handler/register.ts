import {RegisterRequest} from '@account/application/dto/RegisterRequest.js';
import {Register} from '@account/application/useCase/Register.js';
import {RegisterValidator} from '@account/infrastructure/self/http/validator/RegisterValidator.js';
import {formatE164, formatEmail} from '@core/application/stringFormatter.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const {email, password, phone, provider, providerUserId}: RegisterRequest = request.body;

    const sanitizedRequest = {
      email: email ? formatEmail(email) : undefined,
      password,
      phone: phone ? formatE164(phone) : undefined,
      provider,
      providerUserId
    };

    RegisterValidator.validate(sanitizedRequest);

    const useCase = dependencyContainer.get<Register>(Register);

    await useCase.run(sanitizedRequest);

    response.status(HTTP_SUCCESS_CODES.CREATED).send('Account created.');
  } catch (error) {
    next(error);
  }
};
