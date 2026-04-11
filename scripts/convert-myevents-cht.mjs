import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve('src/data/myevents_cht.json');
const outputPath = resolve('src/data/myevents_cht_timeline.json');

const colorMap = {
  Bible: '#0891b2',
  World: '#7c3aed',
};

function toAstronomicalYear(yearNum) {
  const year = Math.trunc(yearNum);
  return year < 0 ? -(Math.abs(year) - 1) : year;
}

function toIsoYear(year) {
  if (year < 0) {
    return `-${String(Math.abs(year)).padStart(4, '0')}`;
  }
  return String(year).padStart(4, '0');
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 48);
}

function buildId(item, astronomicalYear, index, usedIds) {
  const yearPart = astronomicalYear < 0 ? `bce-${Math.abs(astronomicalYear) + 1}` : `ce-${astronomicalYear}`;
  const titlePart = slugify(item.event);
  const typePart = slugify(item.event_type);
  const fallbackTitlePart = titlePart || `event-${index + 1}`;
  const baseId = `${typePart || 'event'}-${yearPart}-${fallbackTitlePart}`;

  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

const raw = readFileSync(sourcePath, 'utf8');
const sourceEvents = JSON.parse(raw);
const usedIds = new Set();

const convertedEvents = sourceEvents.map((item, index) => {
  const astronomicalYear = toAstronomicalYear(item.year_num);

  return {
    id: buildId(item, astronomicalYear, index, usedIds),
    title: item.event,
    start: `${toIsoYear(astronomicalYear)}-01-01`,
    description: item.year_text,
    groupId: item.event_type,
    color: colorMap[item.event_type] ?? '#6b7280',
    importance: 0,
    metadata: {
      originalYearNum: item.year_num,
      originalYearText: item.year_text,
      originalEventType: item.event_type,
    },
  };
});

writeFileSync(outputPath, `${JSON.stringify(convertedEvents, null, 2)}\n`, 'utf8');

console.log(`Converted ${convertedEvents.length} events to ${outputPath}`);