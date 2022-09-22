# arcade-songs-fetch

[![Coding Style](https://img.shields.io/badge/code_style-airbnb-%234B32C3)](https://github.com/airbnb/javascript) [![Gitmoji](https://img.shields.io/badge/commit_style-%20😜%20😍-%23FFDD67)](https://gitmoji.dev) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch?ref=badge_shield)

Data fetching scripts for [arcade-songs](https://github.com/zetaraku/arcade-songs) website.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS version or above)
- [AWS CLI v2](https://aws.amazon.com/cli/) (optional)

## Setup

- Run the following commands:

  ```sh
  npm install
  npm run db:migrate:all
  ```

- Make a copy of the `.env.example` file as `.env` and fill out the required fields.

## Usage

```sh
npm run <game-code>:all
# or
npm run <game-code>:<script-name>
```

- Available `<game-code>`:
  - `maimai` (maimai)
  - `chunithm` (CHUNITHM)
  - `wacca` (WACCA)
  - `taiko` (太鼓の達人)
  - `jubeat` (jubeat)
  - `sdvx` (SOUND VOLTEX)
  - `ongeki` (オンゲキ)
  - `gc` (GROOVE COASTER)
  - `diva` (Project DIVA Arcade)

- Available `<script-name>`:
  - See `package.json`.

## License

Copyright © 2022 Raku Zeta.

Licensed under the [MIT License](./LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch?ref=badge_large)
