const { getClaudeClient, getClaudeModel, STRICT_JSON_SYSTEM_PROMPT } = require("../config/claude");
const store = require("./store");
const mockData = require("./mockData");

const OPTION_KEYS = ["A", "B", "C", "D"];

function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}
const DJ_AFRO_DIRECTION = [
  "Use DJ Afro narration style: dramatic, exaggerated, larger-than-life, and full of playful hyperbole.",
  "Use dramatic pauses written as '...'.",
  "Keep it fun, PG-rated, culturally warm, and never mocking or offensive."
].join(" ");

function extractJsonText(response) {
  const textPart = response?.content?.find((part) => part.type === "text");
  return textPart ? textPart.text.trim() : "";
}

async function requestStrictJson(userPrompt, fallback, normalize) {
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

    const parsed = JSON.parse(extractJsonText(response));
    return normalize ? normalize(parsed, fallback()) : parsed;
  } catch (error) {
    console.warn("Claude JSON generation failed, using fallback:", error.message);
    return fallback();
  }
}

function collapseWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureString(value, fallback) {
  const text = collapseWhitespace(value);
  return text || fallback;
}

function trimText(value, maxLength) {
  const text = collapseWhitespace(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function resolveMatch(context) {
  if (context?.match) {
    return context.match;
  }

  if (context?.homeTeam && context?.awayTeam) {
    return context;
  }

  return store.getMatchState();
}

function compactMatchContext(match) {
  return {
    title: match.title,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    venue: match.venue,
    score: match.score,
    minute: match.minute,
    status: match.status,
    halftimeAct: match.halftimeAct
  };
}

function choicesToOptions(choices) {
  return OPTION_KEYS.reduce((options, key, index) => {
    options[key] = choices[index];
    return options;
  }, {});
}

function toChoiceArray(value, fallbackChoices) {
  const rawChoices = Array.isArray(value)
    ? value
    : OPTION_KEYS.map((key) => value?.[key]).filter(Boolean);

  const choices = rawChoices.map((choice) => collapseWhitespace(choice)).filter(Boolean).slice(0, 4);

  return choices.length === 4 ? choices : fallbackChoices;
}

function correctAnswerToLetter(correctAnswer, choices, fallbackLetter = "A") {
  const normalizedAnswer = collapseWhitespace(correctAnswer);
  const asLetter = normalizedAnswer.toUpperCase();

  if (OPTION_KEYS.includes(asLetter)) {
    return asLetter;
  }

  const choiceIndex = choices.findIndex((choice) => choice.toLowerCase() === normalizedAnswer.toLowerCase());

  return choiceIndex >= 0 ? OPTION_KEYS[choiceIndex] : fallbackLetter;
}

function normalizeTrivia(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Trivia response was not an object");
  }

  const choices = toChoiceArray(payload.choices || payload.options, fallback.choices);
  const answer = correctAnswerToLetter(payload.correctAnswer || payload.answer, choices, fallback.answer);
  const correctAnswer = choices[OPTION_KEYS.indexOf(answer)] || fallback.correctAnswer;

  return {
    id: collapseWhitespace(payload.id) || fallback.id,
    question: ensureString(payload.question, fallback.question),
    choices,
    correctAnswer,
    options: choicesToOptions(choices),
    answer,
    explanation: ensureString(payload.explanation, fallback.explanation)
  };
}

function normalizeMessage(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Message response was not an object");
  }

  return {
    message: trimText(payload.message || payload.sms, 159) || fallback.message
  };
}

function normalizeRecap(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Recap response was not an object");
  }

  return {
    recap: trimText(payload.recap, 320) || fallback.recap
  };
}

function normalizeScript(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Voice script response was not an object");
  }

  return {
    script: trimText(payload.script, 500) || fallback.script
  };
}

async function generateTriviaQuestion(context = store.getMatchState()) {
  const match = resolveMatch(context);
  const fallbackQuestion = sample(mockData.triviaFallback);
  const fallback = () => {
    const choices = [...fallbackQuestion.choices];
    const answer = correctAnswerToLetter(fallbackQuestion.correctAnswer, choices, "A");

    return {
      id: `trivia-${Date.now()}`,
      question: fallbackQuestion.question,
      choices,
      correctAnswer: fallbackQuestion.correctAnswer,
      options: choicesToOptions(choices),
      answer,
      explanation: `Fallback trivia: ${fallbackQuestion.correctAnswer} is correct.`
    };
  };

  const prompt = [
    "Create one live sports-and-music trivia question for this match.",
    DJ_AFRO_DIRECTION,
    "The question text may have dramatic framing, but choices and correctAnswer must stay clear and unambiguous.",
    "correctAnswer must exactly match one of the choices.",
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    "Return exactly this JSON shape:",
    '{"question":"question text","choices":["choice A","choice B","choice C","choice D"],"correctAnswer":"exact choice text"}'
  ].join("\n");

  return requestStrictJson(prompt, fallback, normalizeTrivia);
}

function normalizeHypeArgs(phoneNumber, action, detail, match) {
  if (phoneNumber && typeof phoneNumber === "object") {
    return {
      phoneNumber: phoneNumber.phoneNumber,
      action: phoneNumber.action,
      detail: phoneNumber.detail || phoneNumber.outcome,
      match: resolveMatch(phoneNumber.match)
    };
  }

  return {
    phoneNumber,
    action,
    detail,
    match: resolveMatch(match)
  };
}

async function generateHypeMessage(phoneNumber, action, detail, match) {
  const args = normalizeHypeArgs(phoneNumber, action, detail, match);
  const maskedPhone = store.maskPhone(args.phoneNumber);
  const fallback = () => ({
    message: trimText(
      `Ladies and gentlemen... ${maskedPhone} has entered the scene! ${args.detail || args.action} The people... are watching!`,
      159
    )
  });

  const prompt = [
    "Write one short SMS-ready hype message for a fan action.",
    DJ_AFRO_DIRECTION,
    "Keep it under 160 characters.",
    `Fan: ${maskedPhone}`,
    `Action: ${args.action}`,
    `Detail: ${args.detail}`,
    `Match JSON: ${JSON.stringify(compactMatchContext(args.match))}`,
    "Return exactly this JSON shape:",
    '{"message":"SMS text"}'
  ].join("\n");

  const result = await requestStrictJson(prompt, fallback, normalizeMessage);
  return trimText(result.message, 159);
}

async function generateConfirmation({ phoneNumber, action, outcome, match = store.getMatchState() }) {
  return {
    sms: await generateHypeMessage({
      phoneNumber,
      action,
      detail: outcome,
      match
    })
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

function normalizeRecapArgs(input) {
  if (Array.isArray(input)) {
    return {
      match: store.getMatchState(),
      events: input,
      topFans: []
    };
  }

  return {
    match: resolveMatch(input?.match),
    events: Array.isArray(input?.events) ? input.events : [],
    topFans: Array.isArray(input?.topFans) ? input.topFans : []
  };
}

async function generateMatchRecap(eventLog = {}) {
  const { match, events, topFans } = normalizeRecapArgs(eventLog);
  const fallback = () => ({
    recap: trimText(
      `Full-time... ${match.homeTeam} ${match.score.home}-${match.score.away} ${match.awayTeam}! The pitch gave drama, the fans brought thunder, and top fans rose: ${
        topFans.map((fan) => `${fan.maskedPhone} (${fan.points})`).join(", ") || "the crowd is still gathering"
      }.`,
      320
    )
  });

  const prompt = [
    "Write a 2-3 sentence SMS-length match recap for SMS and dashboard display.",
    DJ_AFRO_DIRECTION,
    "Turn the highlights into a mini action-trailer summary.",
    "Mention the score, one key event, music/fan energy, and top fans if available.",
    "Keep it at 320 characters or less.",
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    `Recent events JSON: ${JSON.stringify(events.slice(0, 8))}`,
    `Top fans JSON: ${JSON.stringify(topFans.slice(0, 3))}`,
    "Return exactly this JSON shape:",
    '{"recap":"2-3 sentence recap"}'
  ].join("\n");

  return requestStrictJson(prompt, fallback, normalizeRecap);
}

async function generateVoiceHypeScript(context = {}) {
  const match = resolveMatch(context?.match || context);
  const recentEvents = Array.isArray(context?.recentEvents) ? context.recentEvents : store.getEvents(5);
  const fallback = () => ({
    script: trimText(
      `Ladies and gentlemen... welcome to Sauti Yetu! ${match.homeTeam} and ${match.awayTeam} are turning this match into cinema... stay locked in!`,
      500
    )
  });

  const prompt = [
    "Write a short Voice/IVR hype-line script meant to be read aloud.",
    DJ_AFRO_DIRECTION,
    "Keep it to 1-3 short spoken sentences.",
    `Match JSON: ${JSON.stringify(compactMatchContext(match))}`,
    `Recent events JSON: ${JSON.stringify(recentEvents.slice(0, 5))}`,
    "Return exactly this JSON shape:",
    '{"script":"voice script"}'
  ].join("\n");

  return requestStrictJson(prompt, fallback, normalizeScript);
}

module.exports = {
  generateConfirmation,
  generateHypeMessage,
  generateMatchRecap,
  generatePredictionResultMessage,
  generateTriviaQuestion,
  generateVoiceHypeScript
};
