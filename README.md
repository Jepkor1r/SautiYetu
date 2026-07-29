# Sauti Yetu

Sauti Yetu is a hackathon MVP for USSD/SMS-based live sports and music fan engagement. Fans can use any phone to check a live score, predict the next scorer, answer trivia, and vote for man-of-the-match. The backend sends Claude-generated SMS confirmations, streams live match events over Socket.IO, and rewards the top 3 fans with Africa's Talking Airtime at full-time.

## Stack

- Backend: Node.js, Express, Socket.IO
- Africa's Talking: official `africastalking` npm SDK in sandbox mode
- AI: `@anthropic-ai/sdk` with a strict JSON-only system prompt
- Frontend: React + Vite + `socket.io-client`
- Storage: in-memory data module at `server/services/store.js`

## Project Structure

```text
server/
  index.js
  routes/
    sms.js
    ussd.js
    voice.js
  services/
    aiService.js
    eventFeed.js
    gameEngine.js
    leaderboard.js
    rewardService.js
    store.js
  config/
    africastalking.js
    claude.js
dashboard/
  src/
    App.jsx
    EventTicker.jsx
    LiveLeaderboard.jsx
    socket.js
```

## Setup

1. Install backend dependencies.

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

2. In a second terminal, install and run the dashboard.

```bash
cd dashboard
npm install
cp .env.example .env
npm run dev
```

3. Open the dashboard.

```text
http://localhost:5173
```

The API runs at `http://localhost:4000` by default.

## Environment

Backend keys live in `server/.env`.

```env
PORT=4000
DASHBOARD_ORIGIN=http://localhost:5173
AT_USERNAME=sandbox
AT_API_KEY=your_africastalking_sandbox_api_key
AT_SMS_FROM=
AT_AIRTIME_CURRENCY=KES
AT_AIRTIME_REWARD_1=50
AT_AIRTIME_REWARD_2=30
AT_AIRTIME_REWARD_3=20
ANTHROPIC_API_KEY=your_claude_api_key
CLAUDE_MODEL=claude-3-5-sonnet-latest
EVENT_INTERVAL_MS=10000
DEMO_SKIP_EXTERNAL_APIS=false
```

Set `DEMO_SKIP_EXTERNAL_APIS=true` to run fully locally. The app will log mock SMS and airtime sends while keeping the flow working.

> Use `AT_SMS_FROM` for the Africa's Talking sender ID when available. In sandbox mode, you can leave it blank or set a simulated from value.

## Africa's Talking Sandbox

1. Start the backend on port `4000`.
2. Expose it with ngrok.

```bash
ngrok http 4000
```

3. In the Africa's Talking sandbox dashboard, set callback URLs:

```text
USSD callback:  https://YOUR-NGROK-DOMAIN/ussd
SMS callback:   https://YOUR-NGROK-DOMAIN/sms
Voice callback: https://YOUR-NGROK-DOMAIN/voice
```

4. Open the sandbox simulator and dial your sandbox USSD service code. The demo menu supports:

```text
1. Live score
2. Predict next scorer
3. Trivia
4. Vote man of the match
5. Leaderboard
```

5. In the SMS simulator, send these keywords:

```text
SCORE
PLAYERS
PREDICT 1
TRIVIA
TRIVIA A
VOTE 4
BOARD
HELP
```

## Demo Controls

The React dashboard includes buttons to trigger a goal, card, or full-time event. The mock event feed also emits a random match event every 10 seconds. At full-time:

- pending next-goal predictions are resolved on the last goal before full-time
- the leaderboard is frozen for rewards
- the top 3 fans receive airtime through Africa's Talking, or a mock airtime log if external APIs are disabled
- Claude generates a match recap as strict JSON and the recap is broadcast to the dashboard and sent by SMS

## Useful API Endpoints

```text
GET  /api/health
GET  /api/match
GET  /api/players
GET  /api/events
GET  /api/leaderboard
GET  /api/trivia
POST /ussd
POST /sms
POST /api/demo/event      { "type": "goal" | "card" | "halftime" | "fulltime" }
POST /api/demo/reset
```
