import statusCodes from "http-status-codes";

const notFoundMiddleware = (req, res) => {
  res.status(statusCodes.NOT_FOUND).json({
    message: "Route does not exist",
  });
};

export default notFoundMiddleware;
