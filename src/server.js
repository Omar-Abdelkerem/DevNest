import "dotenv/config";

import app from "./app.js";
import client from "./config/redis.client.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(
        `Server is running on port ${PORT}, http://localhost:${PORT}`,
      );
    });
  } catch (error) {
    console.error("Error starting the server:", error);
  }
};

startServer();

export default startServer;
