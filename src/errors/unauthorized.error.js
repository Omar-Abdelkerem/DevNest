import statusCodes from "http-status-codes";
import AppError from "../errors/app.error.js";

class UnauthorizedError extends AppError {
  constructor(message) {
    super(message, statusCodes.FORBIDDEN);
  }
}
export default UnauthorizedError;
