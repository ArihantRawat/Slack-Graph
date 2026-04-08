# Slack-Graph

This is a lightweight MVP for Slack-Graph, an app that connects to Slack and builds a people graph from your recent conversations.

## Project goal

Slack-Graph helps you understand your communication network by turning Slack conversations into a relationship graph:

- each node is a person you interact with
- each edge captures interaction strength
- each connection includes a relationship summary and top discussion topics

## What it does

- Connects to Slack with OAuth
- Pulls recent conversations the authenticated user can access
- Builds a graph centered on you
- Shows people as nodes and relationship strength as edges
- Explains why a connection exists using message counts, mentions, and shared channels
- Classifies your relationship with each person (for example: Core collaborator, Team channel partner)
- Extracts the top 5 topics you discuss with each person from recent message text

## Why this is an MVP

Slack data access depends on workspace permissions and app scopes. This project uses a user token so the graph reflects conversations the signed-in Slack user can access.

## Required Slack app setup

Create a Slack app and configure:

- Redirect URL: `https://localhost:3000/auth/slack/callback`
- User token scopes:
  - `channels:read`
  - `channels:history`
  - `groups:read`
  - `groups:history`
  - `im:read`
  - `im:history`
  - `mpim:read`
  - `mpim:history`
  - `users:read`

Then copy `.env.example` to `.env` and fill in your Slack credentials.

## Run locally

```bash
npm run dev
```

Open `https://localhost:3000`.

## Run on GitHub Pages

This repository now supports GitHub Pages deployment from the `public` folder.

1. Push your code to GitHub (`main` branch).
2. In your repository settings, enable GitHub Pages with **GitHub Actions** as the source.
3. The workflow `.github/workflows/deploy-pages.yml` will publish the static UI.

### Important limitation on Pages

GitHub Pages is static hosting, so Slack OAuth and live Slack graph fetch need a backend API.

- Demo mode works out of the box on Pages (loaded from `public/data/demo-graph.json`).
- For live Slack data on Pages, set `window.SLACK_GRAPH_CONFIG.apiBase` in `public/runtime-config.js` to your backend URL.

## Architecture

- `server.js`: thin server bootstrap
- `src/server/`: modular backend pieces (config, request routes, Slack API client, graph builder, static handler)
- `public/index.html`: UI shell
- `public/styles.css`: visual design and responsive layout
- `public/app.js`: frontend coordinator
- `public/js/`: modular frontend logic (api, state, setup, viewport, graph rendering)

## Notes

- Tokens are stored in memory for the current process only.
- The graph is built from recent messages and should be treated as a directional signal, not a perfect social map.
- Private conversations only appear if the authenticated user can access them.
