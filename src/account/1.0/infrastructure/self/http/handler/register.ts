import {RegisterRequest} from '@account/application/dto/RegisterRequest.js';
import {Register} from '@account/application/useCase/Register.js';
import {RegisterValidator} from '@account/infrastructure/self/http/validator/RegisterValidator.js';
import {HTTP_SUCCESS_CODES} from '@core/domain/type/HttpCodes.js';
import {dependencyContainer} from '@src/dependencyContainer.js';
import {NextFunction, Request, Response} from 'express';

export default async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  try {
    const {email, password, phone, provider, providerUserId}: RegisterRequest = request.body;

    const registerRequest: RegisterRequest = {email, password, phone, provider, providerUserId};

    RegisterValidator.validate(registerRequest);

    const registerUseCase = dependencyContainer.get<Register>(Register);

    await registerUseCase.run(registerRequest);

    response.status(HTTP_SUCCESS_CODES.CREATED).send('Account created.');
  } catch (error) {
    next(error);
  }
};
