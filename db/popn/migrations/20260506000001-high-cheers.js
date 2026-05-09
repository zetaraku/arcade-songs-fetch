const { QueryTypes } = require('sequelize');

/**
 * @typedef {import('sequelize').QueryInterface} QueryInterface
 */

async function up(/** @type {QueryInterface} */ queryInterface) {
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Songs"
    SET
      "version" = CASE "version"
        WHEN 'pop''n 1' THEN 'pop''n music'
        WHEN 'pop''n 2' THEN 'pop''n music 2'
        WHEN 'pop''n 3' THEN 'pop''n music 3'
        WHEN 'pop''n 4' THEN 'pop''n music 4'
        WHEN 'pop''n 5' THEN 'pop''n music 5'
        WHEN 'pop''n 6' THEN 'pop''n music 6'
        WHEN 'pop''n 7' THEN 'pop''n music 7'
        WHEN 'pop''n 8' THEN 'pop''n music 8'
        WHEN 'pop''n 9' THEN 'pop''n music 9'
        WHEN 'pop''n 10' THEN 'pop''n music 10'
        WHEN 'pop''n 11' THEN 'pop''n music 11'
        WHEN 'pop''n 12 いろは' THEN 'pop''n music 12 いろは'
        WHEN 'pop''n 13 カーニバル' THEN 'pop''n music 13 カーニバル'
        WHEN 'pop''n 14 FEVER!' THEN 'pop''n music 14 FEVER！'
        WHEN 'pop''n 15 ADVENTURE' THEN 'pop''n music 15 ADVENTURE'
        WHEN 'pop''n 16 PARTY♪' THEN 'pop''n music 16 PARTY♪'
        WHEN 'pop''n 17 THE MOVIE' THEN 'pop''n music 17 THE MOVIE'
        WHEN 'pop''n 18 せんごく列伝' THEN 'pop''n music 18 せんごく列伝'
        WHEN 'pop''n 19 TUNE STREET' THEN 'pop''n music 19 TUNE STREET'
        WHEN 'pop''n 20 fantasia' THEN 'pop''n music 20 fantasia'
        WHEN 'pop''n Sunny Park' THEN 'pop''n music Sunny Park'
        WHEN 'pop''n ラピストリア' THEN 'pop''n music ラピストリア'
        WHEN 'pop''n éclale' THEN 'pop''n music éclale'
        WHEN 'pop''n うさぎと猫と少年の夢' THEN 'pop''n music うさぎと猫と少年の夢'
        WHEN 'pop''n peace' THEN 'pop''n music peace'
        WHEN 'pop''n 解明リドルズ' THEN 'pop''n music 解明リドルズ'
        WHEN 'pop''n UniLab' THEN 'pop''n music UniLab'
        WHEN 'pop''n Jam&Fizz' THEN 'pop''n music Jam&Fizz'
        ELSE "version"
      END
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Songs"
    SET
      "songId" = replace("songId", '(UPPER) ', '') || '(UPPER)',
      "title" = "title" || '(UPPER)'
    WHERE "songId" LIKE '(UPPER) %'
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Sheets"
    SET
      "songId" = replace("songId", '(UPPER) ', '') || '(UPPER)'
    WHERE "songId" LIKE '(UPPER) %'
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "JpSheets"
    SET
      "songId" = replace("songId", '(UPPER) ', '') || '(UPPER)'
    WHERE "songId" LIKE '(UPPER) %'
  `);
  await queryInterface.bulkUpdate(
    'Sheets',
    { difficulty: 'light' },
    { difficulty: 'easy' },
  );
  await queryInterface.bulkUpdate(
    'JpSheets',
    { difficulty: 'light' },
    { difficulty: 'easy' },
  );
}

async function down(/** @type {QueryInterface} */ queryInterface) {
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Songs"
    SET
      "version" = CASE "version"
        WHEN 'pop''n music' THEN 'pop''n 1'
        WHEN 'pop''n music 2' THEN 'pop''n 2'
        WHEN 'pop''n music 3' THEN 'pop''n 3'
        WHEN 'pop''n music 4' THEN 'pop''n 4'
        WHEN 'pop''n music 5' THEN 'pop''n 5'
        WHEN 'pop''n music 6' THEN 'pop''n 6'
        WHEN 'pop''n music 7' THEN 'pop''n 7'
        WHEN 'pop''n music 8' THEN 'pop''n 8'
        WHEN 'pop''n music 9' THEN 'pop''n 9'
        WHEN 'pop''n music 10' THEN 'pop''n 10'
        WHEN 'pop''n music 11' THEN 'pop''n 11'
        WHEN 'pop''n music 12 いろは' THEN 'pop''n 12 いろは'
        WHEN 'pop''n music 13 カーニバル' THEN 'pop''n 13 カーニバル'
        WHEN 'pop''n music 14 FEVER！' THEN 'pop''n 14 FEVER!'
        WHEN 'pop''n music 15 ADVENTURE' THEN 'pop''n 15 ADVENTURE'
        WHEN 'pop''n music 16 PARTY♪' THEN 'pop''n 16 PARTY♪'
        WHEN 'pop''n music 17 THE MOVIE' THEN 'pop''n 17 THE MOVIE'
        WHEN 'pop''n music 18 せんごく列伝' THEN 'pop''n 18 せんごく列伝'
        WHEN 'pop''n music 19 TUNE STREET' THEN 'pop''n 19 TUNE STREET'
        WHEN 'pop''n music 20 fantasia' THEN 'pop''n 20 fantasia'
        WHEN 'pop''n music Sunny Park' THEN 'pop''n Sunny Park'
        WHEN 'pop''n music ラピストリア' THEN 'pop''n ラピストリア'
        WHEN 'pop''n music éclale' THEN 'pop''n éclale'
        WHEN 'pop''n music うさぎと猫と少年の夢' THEN 'pop''n うさぎと猫と少年の夢'
        WHEN 'pop''n music peace' THEN 'pop''n peace'
        WHEN 'pop''n music 解明リドルズ' THEN 'pop''n 解明リドルズ'
        WHEN 'pop''n music UniLab' THEN 'pop''n UniLab'
        WHEN 'pop''n music Jam&Fizz' THEN 'pop''n Jam&Fizz'
        ELSE "version"
      END
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Songs"
    SET
      "songId" = '(UPPER) ' || replace("songId", '(UPPER)', ''),
      "title" = replace("title", '(UPPER)', '')
    WHERE "songId" LIKE '%(UPPER)'
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "Sheets"
    SET
      "songId" = '(UPPER) ' || replace("songId", '(UPPER)', '')
    WHERE "songId" LIKE '%(UPPER)'
  `);
  queryInterface.sequelize.query(/* sql */ `
    UPDATE "JpSheets"
    SET
      "songId" = '(UPPER) ' || replace("songId", '(UPPER)', '')
    WHERE "songId" LIKE '%(UPPER)'
  `);
  await queryInterface.bulkUpdate(
    'Sheets',
    { difficulty: 'easy' },
    { difficulty: 'light' },
  );
  await queryInterface.bulkUpdate(
    'JpSheets',
    { difficulty: 'easy' },
    { difficulty: 'light' },
  );
}

module.exports = { up, down };
