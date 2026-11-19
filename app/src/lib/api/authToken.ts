type TokenProvider = () => Promise<string | null>;

let provider: TokenProvider = async () => null;

/** Registered by the auth layer so the HTTP client never imports an auth SDK directly. */
export const setAuthTokenProvider = (next: TokenProvider) => {
  provider = next;
};

export const getAuthToken = () => provider();
