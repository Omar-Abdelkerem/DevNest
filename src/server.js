import "dotenv/config";
import { validateProductionEnv } from "./config/env.js";
import { ensureSchema } from "./config/ensureSchema.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    validateProductionEnv();
    await ensureSchema();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server:", error.message);
    process.exit(1);
  }
};

startServer();

export default startServer;
