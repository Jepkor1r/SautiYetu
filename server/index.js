require("dotenv").config();

const cors = require("cors");
const express = require("express");
const http = require("http");
const morgan = require("morgan");
const { Server } = require("socket.io");

const eventFeed = require("./services/eventFeed");
const gameEngine = require("./services/gameEngine");
const leaderboard = require("./services/leaderboard");
const rewardService = require("./services/rewardService");
const store = require("./services/store");
const mockData = require("./services/mockData");
const smsRouter = require("./routes/sms");
const ussdRouter = require("./routes/ussd");
const voiceRouter = require("./routes/voice");

const app = express();
const server = http.createServer(app);
const dashboardOrigin = process.env.DASHBOARD_ORIGIN || "http://localhost:5173";
const port = Number(process.env.PORT || 4000);

const io = new Server(server, {
  cors: {
    origin: dashboardOrigin,
    methods: ["GET", "POST"]
  }
});

const feed = eventFeed.createEventFeed();

app.set("io", io);
app.use(cors({ origin: dashboardOrigin }));
app.use(morgan("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "Sauti Yetu",
    matchStatus: store.getMatchState().status,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/match", (req, res) => {
  res.json(store.getMatchState());
});

app.get("/api/players", (req, res) => {
  res.json(store.players);
});

app.get("/api/events", (req, res) => {
  res.json(store.getEvents(Number(req.query.limit || 40)));
});

app.get("/api/leaderboard", (req, res) => {
  res.json(leaderboard.getLeaderboard(Number(req.query.limit || 20)));
});

app.get("/api/rewards", (req, res) => {
  res.json(store.getRewards());
});

app.get("/api/trivia", async (req, res, next) => {
  try {
    res.json(await gameEngine.getOrCreateTrivia());
  } catch (error) {
    next(error);
  }
});

app.post("/api/demo/event", async (req, res, next) => {
  try {
    const event = feed.emitRandomEvent(req.body.type);
    res.json({
      ok: true,
      event
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demo/reward", async (req, res, next) => {
  try {
    const result = await rewardService.rewardTopFans({ io });
    res.json({
      ok: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/demo/reset", (req, res) => {
  store.resetDemo();
  rewardService.resetRewardState();
  gameEngine.emitDashboardState(io);
  res.json({
    ok: true,
    match: store.getMatchState()
  });
});

app.get("/api/demo/mock-events", (req, res) => {
  res.json(mockData.mockEventLog);
});

app.use("/ussd", ussdRouter);
app.use("/sms", smsRouter);
app.use("/sms_callback", smsRouter);
app.use("/voice", voiceRouter);

io.on("connection", (socket) => {
  socket.emit("match:update", store.getMatchState());
  socket.emit("leaderboard:update", leaderboard.getLeaderboard());
  socket.emit("events:update", store.getEvents());
});

feed.on("match:event", async (event) => {
  try {
    await gameEngine.applyMatchEvent(event, io);
  } catch (error) {
    console.error("Failed to apply match event:", error);
  }
});

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Not found"
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    ok: false,
    error: error.message
  });
});

server.listen(port, () => {
  console.log(`Sauti Yetu server listening on http://localhost:${port}`);
  feed.start();
});
