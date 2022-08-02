# arcade-songs-fetch

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
