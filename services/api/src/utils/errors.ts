export interface ValidationDetail {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: ValidationDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorBody(error: ApiError): {
  error: { code: string; message: string; details?: ValidationDetail[] };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}
