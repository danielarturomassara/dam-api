export interface ProviderMeta {
  authResponse: {
    accessToken: string;
    expiresIn: number | string;
    userID: string;
  };
  status: string;
}
