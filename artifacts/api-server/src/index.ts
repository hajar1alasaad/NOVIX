import app from "./app.js";
import { logger } from "./lib/logger.js";
import { initStore } from "./lib/store.js";
import { startScheduler } from "./lib/scheduler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize persistent data store
initStore();
logger.info("Agent data store initialized");

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start background agent scheduler after server is up
  startScheduler();
  logger.info("Multi-agent scheduler started");
});
