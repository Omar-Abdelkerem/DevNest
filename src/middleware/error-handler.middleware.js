import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

const errorHandlerMiddleware = (err, req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(err);
  }

  // Default response
  const customError = {
    statusCode: err.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message ?? "Something went wrong.",
  };

  // Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaErrors = {
      P2002: {
        statusCode: StatusCodes.CONFLICT,
        message: err.meta?.target?.length
          ? `${err.meta.target.join(", ")} already exists.`
          : "Duplicate value already exists.",
      },

      P2003: {
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid relation.",
      },

      P2025: {
        statusCode: StatusCodes.NOT_FOUND,
        message: "Resource not found.",
      },
    };

    const prismaError = prismaErrors[err.code];

    if (prismaError) {
      customError.statusCode = prismaError.statusCode;
      customError.message = prismaError.message;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    customError.statusCode = StatusCodes.BAD_REQUEST;
    customError.message = "Invalid data sent to the database.";
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    customError.statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    customError.message = "Database service is currently unavailable.";
  }

  return res.status(customError.statusCode).json({
    success: false,
    error: {
      message: customError.message,
    },
  });
};

export default errorHandlerMiddleware;
