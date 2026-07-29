const AnthropicModule = require("@anthropic-ai/sdk");

const Anthropic = AnthropicModule.default || AnthropicModule;

const STRICT_JSON_SYSTEM_PROMPT = [
  "You are narrating in the style of DJ Afro, the famous Kenyan movie narrator known for dramatic, hyperbolic, larger-than-life commentary with dramatic pauses written as '...'. Keep responses fun, energetic, PG-rated, and never mocking of any individual.",
  "Return only strict valid JSON.",
  "Do not include markdown fences, commentary, prefixes, suffixes, or trailing commas.",
  "Match the requested JSON schema exactly.",
  "Respect every requested character limit."
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
