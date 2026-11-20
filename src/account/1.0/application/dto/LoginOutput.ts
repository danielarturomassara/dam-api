export interface LoginOutput {
  accessToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  refreshToken: string;
  tokenType: 'Bearer';
}
