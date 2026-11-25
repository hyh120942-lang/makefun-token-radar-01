# makefun-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/hyh120942-lang/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/hyh120942-lang/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar: every pre-token protocol in the sealed DefiLlama snapshot, ranked by a fitted implied value, each with a costed farm plan. The size curve is fitted at run time on the snapshot's own 128 live-token comps (log market cap on log TVL); it beats the flat 0.25× TVL baseline on two blind tests (leave-one-out 1.223 vs 1.591, walk-forward 1.069 vs 1.413). A per-category multiple was tested the same way and dropped. The board covers all 40 watchlist protocols plus 158 early finds below the floor, and the dashboard separates protocols whose token already trades (shown at market value) from those still to come.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=hyh120942-lang&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
