/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import YAML from 'yaml';
import axios from 'axios';
import sleep from 'sleep-promise';
import log4js from 'log4js';
import * as cheerio from 'cheerio';
import { difficultyMap } from './fetch-songs';

const logger = log4js.getLogger('sdvx/fetch-gallery');
logger.level = log4js.levels.INFO;

const DATA_PATH = 'data/sdvx';
const DATA_URL = 'https://p.eagate.573.jp';

const versionMap = [
  // { versionId: 'v/p', versionName: 'VIVID WAVE' },
  { versionId: 'vi', versionName: 'EXCEED GEAR' },
];
const courseMap = [
  { courseId: 1, courseTitle: '【Lv.01 岳翔】' },
  { courseId: 2, courseTitle: '【Lv.02 流星】' },
  { courseId: 3, courseTitle: '【Lv.03 月衝】' },
  { courseId: 4, courseTitle: '【Lv.04 瞬光】' },
  { courseId: 5, courseTitle: '【Lv.05 天極】' },
  { courseId: 6, courseTitle: '【Lv.06 烈風】' },
  { courseId: 7, courseTitle: '【Lv.07 雷電】' },
  { courseId: 8, courseTitle: '【Lv.08 麗華】' },
  { courseId: 9, courseTitle: '【Lv.09 魔騎士】' },
  { courseId: 10, courseTitle: '【Lv.10 剛力羅】' },
  { courseId: 11, courseTitle: '【Lv.11 或帝滅斗】' },
  { courseId: 12, courseTitle: '【Lv.∞ 暴龍天】' },
];

export async function fetchGallery(versionId: string) {
  const pagePath = `game/sdvx/${versionId}/playdata/skill/detail.html`;

  const sections = [];

  for (const { courseId, courseTitle } of courseMap) {
    logger.info(`- course ${courseId}: ${courseTitle}`);

    const response = await axios.get(`${DATA_URL}/${pagePath}`, {
      params: {
        course_id: courseId,
      },
    });

    const $ = cheerio.load(response.data);

    sections.push({
      title: courseTitle,
    });

    const subCourses = $('.skill_box, #skill_box02').toArray().reverse()
      .map((skillBox) => {
        const subCourseTitle = $(skillBox).find('.course_name, #course_name').text().trim()
          .replace(/^SKILL ANALYZER /, '');
        const subCourseSheets = $(skillBox).find('.music_box').toArray()
          .map((musicBox) => {
            const title = $(musicBox).find('.music').text().trim();
            const difficulty = difficultyMap.get(
              $(musicBox).find('.diff').attr('id')!.replace(/^diff_/, ''),
            );

            return `${title}|std|${difficulty}`;
          });

        return {
          description: subCourseTitle,
          sheets: subCourseSheets,
        };
      });

    sections.push(...subCourses);

    await sleep(500);
  }

  return sections;
}

export default async function run() {
  logger.info(`Fetching data from: ${DATA_URL} ...`);

  const gallery = [];

  for (const { versionId, versionName } of versionMap) {
    logger.info(`* version '${versionName}'`);

    const sections = await fetchGallery(versionId);

    gallery.push({
      title: `[${versionName}] SKILL ANALYZER（スキルアナライザー）`,
      sections,
    });
  }

  const yamlText = YAML.stringify(gallery);

  logger.info(`Writing output into ${DATA_PATH}/gallery.yaml ...`);
  fs.mkdirSync(DATA_PATH, { recursive: true });
  fs.writeFileSync(`${DATA_PATH}/gallery.yaml`, yamlText);

  logger.info('Done!');
}

if (require.main === module) run();
