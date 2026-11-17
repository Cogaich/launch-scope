# launch-scope

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Cogaich/launch-scope/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Cogaich/launch-scope/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Launch Scope is a token launch radar: it reads a sealed DefiLlama snapshot of 758 protocols, ranks the 198 that record no token by the implied value of the token they may one day issue, and gives each one a concrete farm plan with costs and times. Built by an AI agent for make.fun's token-radar-01 bounty.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

The program needs Node.js 22.18 or later and the sealed snapshot at `--input`. It writes `board.json`, `data.js`, the dashboard and the screenshots to the output directory, plus `dossier.json`.

## How it works

One function, `scopeValue`, scores every protocol from the snapshot's own figures: TVL sets the scale, the seven-day change moves it up or down, and the time a protocol has run with no token yet counts for more. The 40-protocol watchlist is the floor, never the ceiling: the board also ranks every other pre-token protocol the snapshot can rank, including the early ones below the floor. Protocols whose token already trades are set aside in a Live view with their market caps. The dashboard is a static page with no network: sort and filter the board, open any protocol for its model breakdown and farm plan.

---

<sub>Entered on [make.fun](https://make.fun/?ref=d9dj2dyr&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
