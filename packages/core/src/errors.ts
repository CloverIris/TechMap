export class ApiError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly invalidParameters: Array<{ name: string; location: "path" | "query" | "header" | "body"; reason: string }> = []
  ) {
    super(message);
  }
}

export const notFound = (message: string) => new ApiError(404, "resource_not_found", message);
export const gone = (message: string) => new ApiError(410, "release_gone", message);
export const conflict = (message: string) => new ApiError(409, "expansion_not_supported", message);
export const invalid = (name: string, location: "path" | "query" | "header" | "body", reason: string) =>
  new ApiError(400, "invalid_parameter", "The request violates the API contract.", [{ name, location, reason }]);
