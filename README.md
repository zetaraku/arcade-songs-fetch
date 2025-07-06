# arcade-songs-fetch

[![Coding Style](https://img.shields.io/badge/code_style-airbnb-%234B32C3)](https://github.com/airbnb/javascript) [![Gitmoji](https://img.shields.io/badge/commit_style-%20😜%20😍-%23FFDD67)](https://gitmoji.dev) [![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch?ref=badge_shield)

Data fetching scripts for [arcade-songs](https://github.com/zetaraku/arcade-songs) website.

## Prerequisites

- [Bash](https://en.wikipedia.org/wiki/Bash_(Unix_shell)) shell
  - The npm scripts are assumed to be run in `bash` shell.
  - You can use **Git Bash** brought by [Git](https://git-scm.com/) on Windows.
    - You also need to configure the [`script-shell`](https://docs.npmjs.com/cli/v8/using-npm/config#script-shell) to run npm scripts with Git Bash.
    - See: [How to set shell for npm run-scripts in Windows - Stack Overflow](https://stackoverflow.com/a/46006249/8573978)
- [Node.js](https://nodejs.org/) (LTS version or above)
- [AWS CLI v2](https://aws.amazon.com/cli/) (optional)

## Setup

- **(required)** Make a copy of the `.env.example` file as `.env` and fill out the required fields.

- **(required)** Make a copy of the `dbconfig.example.js` file as `dbconfig.js` and customize it if you are using other databases (SQLite is used as the default)

- Run the following commands:

  ```sh
  npm install
  npm run db:create:all  # run this only if you're using a database other than SQLite
  npm run db:migrate:all
  ```

> [!NOTE]
> You might need to re-run the `npm run db:migrate:all` command when the database schema is changed.

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
  - `popn` (pop'n music)
  - `drs` (DANCERUSH STARDOM)
  - `ddr` (DanceDanceRevolution)
  - `nostalgia` (ノスタルジア)
  - `crossbeats` (crossbeats REV.)
  - `rb` (REFLEC BEAT)
  - `gitadora` (GITADORA)
  - `polarischord` (ポラリスコード)

- Available `<script-name>`:
  - See `package.json`.

## License

Copyright © 2022 Raku Zeta.

Licensed under the [MIT License](./LICENSE).

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2Fzetaraku%2Farcade-songs-fetch?ref=badge_large)
