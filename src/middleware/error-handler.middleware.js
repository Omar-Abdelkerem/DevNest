import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors/index.js";

const errorHandlerMiddleware = (err, req, res, _next) => {
  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", err.name, err.message);
  }

  // 1. Zod validation errors -> 400 with field-level details
  if (err instanceof ZodError || err?.name === "ZodError") {
    const issues = err.issues || err.errors || [];
    const fields = issues.map((issue) => ({
      field: Array.isArray(issue.path) && issue.path.length > 0
        ? issue.path.join(".")
        : "body",
      message: issue.message,
    }));
    const firstMessage = fields[0]?.message || "Validation failed.";

    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: {
        message: firstMessage,
        fields,
      },
    });
  }

  // 2. Malformed JSON body -> 400
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: "Malformed JSON request body." },
    });
  }

  // 3. Oversized payload -> 413
  if (err.type === "entity.too.large") {
    return res.status(StatusCodes.REQUEST_TOO_LONG).json({
      success: false,
      error: { message: "Request payload is too large." },
    });
  }

  // 4. Multer file upload errors -> 400 / 413
  if (err instanceof multer.MulterError) {
    const isTooLarge = err.code === "LIMIT_FILE_SIZE";
    return res
      .status(isTooLarge ? StatusCodes.REQUEST_TOO_LONG : StatusCodes.BAD_REQUEST)
      .json({
        success: false,
        error: {
          message: isTooLarge
            ? "Image file exceeds the 5 MB size limit."
            : "Invalid file upload request.",
        },
      });
  }

  // 5. Known application errors
  if (err instanceof AppError || err.isOperational) {
    return res.status(err.statusCode || StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: err.message || "Request failed." },
    });
  }

  // 6. Prisma database errors
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
      return res.status(prismaError.statusCode).json({
        success: false,
        error: { message: prismaError.message },
      });
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: { message: "Invalid data sent to the database." },
    });
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      success: false,
      error: { message: "Database service is currently unavailable." },
    });
  }

  // 7. Generic 500 — NEVER leak internal stack traces, paths, or ORM error text
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      message: "Something went wrong. Please try again later.",
    },
  });
};

export default errorHandlerMiddleware;
