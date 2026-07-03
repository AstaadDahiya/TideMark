# Tidemark — A Bottle Drifts Between Strangers

Tidemark is an interactive, asynchronous social game built for Reddit communities using the **Devvit Developer Platform** and **Phaser**. 

In Tidemark, players cast virtual bottles into a calm, procedurally generated ocean. Each bottle contains a message, a stamp, and a chosen glass color. Other players on the subreddit can discover these bottles drifting in their ocean, open them, and read the messages inside. 

The core experience revolves around the quiet, emotional resonance of finding a stranger's message and the choice to either keep it in your personal collection or cast it back into the sea for someone else to find.

## Features

- **Asynchronous Multiplayer:** Cast a bottle and wait for someone else in the community to find it. 
- **Phaser 4 Integration:** A serene, animated ocean environment built with Phaser 4 running within a Devvit Webview.
- **Customizable Bottles:** Choose the glass color, add a unique stamp, and write a message.
- **Passport Tracking:** Each bottle has a passport that tracks its journey across the ocean, logging who has found it.
- **Personal Collection:** Keep bottles you find in your personal collection dashboard.
- **HiDPI Support:** Crisp text and graphics rendering on all devices.

## Technology Stack

- **Platform:** [Reddit Devvit Platform](https://developers.reddit.com/)
- **Frontend/Renderer:** [Phaser 4](https://phaser.io/)
- **Backend/API:** [Hono](https://hono.dev/)
- **Data Storage:** Devvit Redis (KV Store via Sorted Sets)
- **Language:** TypeScript

## How to Play

1. Launch the Tidemark post from a supported subreddit.
2. The ocean is quiet today. Tap **"Cast a Bottle"** to begin.
3. Select a bottle design, stamp, and write a message.
4. Cast your bottle into the sea.
5. Return later to find bottles cast by others. Tap a drifting bottle to read its message.
6. Check the passport to see its journey.
7. Choose to **Keep** the bottle in your collection, or **Cast into Sea** to let it continue its journey.

## Development

This project uses `vite` for building the webview assets and Devvit CLI for deploying the app.

### Scripts
- `npm run dev`: Build the web assets in watch mode.
- `npm run build`: Build the web assets for production.

### Deployment
```bash
devvit upload
devvit publish
```

*Built for the 2026 Reddit Games Hackathon.*
