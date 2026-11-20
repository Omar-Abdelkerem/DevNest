import "dotenv/config";
import { validateProductionEnv } from "./config/env.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    validateProductionEnv();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error.message);
    process.exit(1);
  }
};

startServer();

export default startServer;
