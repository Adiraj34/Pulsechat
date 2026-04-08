export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function badRequest(message, details) {
  return new ApiError(400, message, details);
}

export function unauthorized(message = "Authentication is required.") {
  return new ApiError(401, message);
}

export function forbidden(message = "You do not have access to perform this action.") {
  return new ApiError(403, message);
}

export function notFound(message = "The requested resource was not found.") {
  return new ApiError(404, message);
}
