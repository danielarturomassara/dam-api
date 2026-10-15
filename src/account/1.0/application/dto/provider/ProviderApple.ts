export interface ProviderApple {
  code: string;
  id_token: string;
  state: string;
  user?: ProviderAppleUser;
}

export interface ProviderAppleUser {
  email: string;
  name: {
    firstName: string;
    lastName: string;
  };
}
