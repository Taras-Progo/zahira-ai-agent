/** Application error with an HTTP status code and machine-readable code. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, "BAD_REQUEST", message, details);

export const unauthorized = (message = "Não autorizado") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "Acesso negado") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "Recurso não encontrado") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message: string) =>
  new AppError(409, "CONFLICT", message);

export const internal = (message = "Erro interno do servidor") =>
  new AppError(500, "INTERNAL_ERROR", message);
