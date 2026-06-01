import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type Source = "body" | "query" | "params";

/** Validates a request part against a Zod schema and replaces it with parsed data. */
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Store parsed/coerced data for handlers to consume.
    if (source === "query") {
      (req as Request & { validatedQuery: unknown }).validatedQuery =
        result.data;
    } else {
      req[source] = result.data;
    }
    next();
  };
}
