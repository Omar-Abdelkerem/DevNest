import statusCodes from "http-status-codes";
import AppError from "./app.error.js";

class unauthenticatedError extends AppError {
  constructor(message) {
    super(message, statusCodes.UNAUTHORIZED);
  }
}

export default unauthenticatedError;
