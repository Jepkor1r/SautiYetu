const AfricasTalking = require("africastalking");

const username = process.env.AT_USERNAME || "sandbox";
const apiKey = process.env.AT_API_KEY || "";
const smsFrom = process.env.AT_SMS_FROM || undefined;
const skipExternalApis = process.env.DEMO_SKIP_EXTERNAL_APIS === "true";

let client = null;

if (apiKey && !skipExternalApis) {
  client = AfricasTalking({
    apiKey,
    username
  });
}

function isConfigured() {
  return Boolean(client);
}

function getSmsClient() {
  return client ? client.SMS : null;
}

function getAirtimeClient() {
  return client ? client.AIRTIME : null;
}

module.exports = {
  getAirtimeClient,
  getSmsClient,
  isConfigured,
  smsFrom,
  username
};
