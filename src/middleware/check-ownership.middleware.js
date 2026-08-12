import { notFoundError, unauthorizedError } from "../errors/index.js";

const unauthorizedMessage = "You are not authorized to access this route";

const checkOwnership = (getResource, ownerField, idSchema) => {
  return async (req, res, next) => {
    const { id } = idSchema.parse(req.params); // validate the id parameter using the provided schema
    const userId = req.user.userId;

    const resource = await getResource(id);

    if (!resource) {
      throw new notFoundError("Resource not found");
    }
    if (resource[ownerField] !== userId) {
      throw new unauthorizedError(unauthorizedMessage);
    }
    req.resource = resource; // <-- stash the resource on the request object
    next();
  };
};
export default checkOwnership;
