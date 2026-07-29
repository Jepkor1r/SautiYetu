const AnthropicModule = require("@anthropic-ai/sdk");

const Anthropic = AnthropicModule.default || AnthropicModule;

const STRICT_JSON_SYSTEM_PROMPT = [
  "You are the Sauti Yetu fan engagement AI.",
  "Return only strict valid JSON.",
  "Do not include markdown fences, commentary, prefixes, suffixes, or trailing commas.",
  "Match the requested JSON schema exactly.",
  "Keep SMS copy under 140 characters unless asked for a recap."
].join(" ");

function getClaudeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || process.env.DEMO_SKIP_EXTERNAL_APIS === "true") {
    return null;
  }

  return new Anthropic({
    apiKey
  });
}

function getClaudeModel() {
  return process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest";
}

module.exports = {
  getClaudeClient,
  getClaudeModel,
  STRICT_JSON_SYSTEM_PROMPT
};
