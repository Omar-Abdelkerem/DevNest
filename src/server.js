import "dotenv/config";
import { validateProductionEnv } from "./config/env.js";
import { ensureSchema } from "./config/ensureSchema.js";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    validateProductionEnv();
    // Bind dual-stack (IPv4 + IPv6) immediately so Railway/Render proxy connects right away
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Run idempotent schema sync asynchronously after port is open
      ensureSchema().catch((err) => {
        console.warn("Background schema sync warning:", err.message);
      });
    });
  } catch (error) {
    console.error("Error starting the server:", error.message);
    process.exit(1);
  }
};

startServer();

export default startServer;
