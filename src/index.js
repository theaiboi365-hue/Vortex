import { assertBaseConfig, config } from "./config.js";
import { startDashboard } from "./dashboard.js";
import { startSlack } from "./slack.js";
import { startTelegram } from "./telegram.js";

assertBaseConfig();

console.log(`${config.botName} starting...`);
startDashboard();
startSlack();
startTelegram();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
