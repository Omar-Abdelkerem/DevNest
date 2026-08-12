import statusCodes from "http-status-codes";
import AppError from "../errors/app.error.js";

class badRequestError extends AppError {
  constructor(message) {
    super(message, statusCodes.BAD_REQUEST);
  }
}
export default badRequestError;
