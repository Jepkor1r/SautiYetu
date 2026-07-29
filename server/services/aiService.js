const { getClaudeClient, getClaudeModel, STRICT_JSON_SYSTEM_PROMPT } = require("../config/claude");
const store = require("./store");

function extractJsonText(response) {
  const textPart = response.content.find((part) => part.type === "text");
  return textPart ? textPart.text.trim() : "";
}

async function requestStrictJson(userPrompt, fallback) {
  const client = getClaudeClient();

  if (!client) {
    return fallback();
  }

  try {
    const response = await client.messages.create({
      model: getClaudeModel(),
      max_tokens: 500,
      temperature: 0.6,
      system: STRICT_JSON_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    return JSON.parse(extractJsonText(response));
  } catch (error) {
    console.warn("Claude JSON generation failed, using fallback:", error.message);
    return fallback();
  }
}

function compactMatchContext(match) {
  return {
    title: match.title,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: match.score,
    minute: match.minute,
    status: match.status,
    halftimeAct: match.halftimeAct
  };
}

async function generateTriviaQuestion(match = store.getMatchState()) {
  const fallback = () => ({
    id: `trivia-${Date.now()}`,
    question: "Which team is hosting tonight's Sauti Derby?",
    options: {
      A: match.homeTeam,
      B: match.awayTeam,
      C: "Kisumu Crescendos",
      D: "Eldoret Echoes"
    },
    answer: "A",
    explanation: `${match.homeTeam} are listed as the home side tonight.`
  });

  const prompt = [
    "Create one live sports-and-music trivia question for this match.",
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    "Return exactly this JSON shape:",
    '{"id":"short-unique-id","question":"question text","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"one short sentence"}'
  ].join("\n");

  const trivia = await requestStrictJson(prompt, fallback);

  return {
    id: trivia.id || `trivia-${Date.now()}`,
    question: String(trivia.question || fallback().question),
    options: {
      A: String(trivia.options?.A || fallback().options.A),
      B: String(trivia.options?.B || fallback().options.B),
      C: String(trivia.options?.C || fallback().options.C),
      D: String(trivia.options?.D || fallback().options.D)
    },
    answer: String(trivia.answer || "A").trim().toUpperCase().slice(0, 1),
    explanation: String(trivia.explanation || fallback().explanation)
  };
}

async function generateConfirmation({ phoneNumber, action, outcome, match = store.getMatchState() }) {
  const fallback = () => ({
    sms: `Sauti Yetu: ${outcome}. ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}. Keep playing.`
  });

  const prompt = [
    "Write one energetic personalized SMS confirmation for a fan action.",
    "Keep it under 140 characters.",
    `Fan: ${store.maskPhone(phoneNumber)}`,
    `Action: ${action}`,
    `Outcome: ${outcome}`,
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    "Return exactly this JSON shape:",
    '{"sms":"message"}'
  ].join("\n");

  const result = await requestStrictJson(prompt, fallback);
  const sms = String(result.sms || fallback().sms).replace(/\s+/g, " ").trim();

  return {
    sms: sms.slice(0, 160)
  };
}

async function generatePredictionResultMessage({ phoneNumber, playerName, correct, match = store.getMatchState() }) {
  const outcome = correct
    ? `${playerName} scored. Your prediction hit for +10 points`
    : `${playerName} scored before your pick. Prediction reset`;

  return generateConfirmation({
    phoneNumber,
    action: "next goal prediction result",
    outcome,
    match
  });
}

async function generateMatchRecap({ match = store.getMatchState(), events = [], topFans = [] }) {
  const fallback = () => ({
    recap: `${match.title} full-time: ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}. Top fans: ${
      topFans.map((fan) => `${fan.maskedPhone} (${fan.points})`).join(", ") || "none yet"
    }.`
  });

  const prompt = [
    "Write a concise full-time match recap for SMS and dashboard display.",
    "Mention the score, one key event, music/fan energy, and top fans.",
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    `Recent events JSON: ${JSON.stringify(events.slice(0, 8))}`,
    `Top fans JSON: ${JSON.stringify(topFans.slice(0, 3))}`,
    "Return exactly this JSON shape:",
    '{"recap":"2-3 sentence recap"}'
  ].join("\n");

  const result = await requestStrictJson(prompt, fallback);

  return {
    recap: String(result.recap || fallback().recap).trim()
  };
}

module.exports = {
  generateConfirmation,
  generateMatchRecap,
  generatePredictionResultMessage,
  generateTriviaQuestion
};
