export type AuthFetch = (endpoint: string, options?: RequestInit) => Promise<unknown>;

export type FetchValidationError = {
  value?: string;
  msg: string;
  param: string;
  location?: string;
};
