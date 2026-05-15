import { assertBaseConfig, config } from "./config.js";
import { startSlack } from "./slack.js";
import { startTelegram } from "./telegram.js";

assertBaseConfig();

console.log(`${config.botName} starting...`);
startSlack();
startTelegram();

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});
