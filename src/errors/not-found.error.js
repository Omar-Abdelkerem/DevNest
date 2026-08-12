import statusCodes from "http-status-codes";
import AppError from "../errors/app.error.js";

class notFoundError extends AppError {
  constructor(message) {
    super(message, statusCodes.NOT_FOUND);
  }
}

export default notFoundError;
