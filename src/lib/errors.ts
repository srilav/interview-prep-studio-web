import { Code, ConnectError } from "@connectrpc/connect";

/** Turns any thrown value into a message a person can act on. */
export function errorMessage(e: unknown): string {
  const err = ConnectError.from(e);
  if (err.code === Code.Unavailable || (err.code === Code.Unknown && /fetch/i.test(err.rawMessage))) {
    return "Can't reach the API. Check that the backend and Envoy are running (see README).";
  }
  return err.rawMessage || err.message;
}

export function isAbort(e: unknown): boolean {
  return ConnectError.from(e).code === Code.Canceled;
}
