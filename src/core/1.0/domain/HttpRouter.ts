import { Router } from 'express';

export interface HttpRouter {
  getBasePath (): string
  registerRoutes (): Promise<Router>
}

export const HTTP_ROUTER = Symbol.for('HttpRouter');
