/**
 * Генерирует src/lib/tradeableData.generated.ts — что из предметов Sunflower
 * Land разрешено торговать на маркетплейсе, по коду самой игры:
 *
 *  - TRADE_LIMITS (actions/tradeLimits.ts) — ресурсы, открытые для торговли
 *    (имя → лимит листинга). Важно: ресурсы вроде Obsidian/Oil/Sunstone там
 *    ИСКЛЮЧЕНЫ — они не торгуются, даже если когда-то торговались.
 *  - INVENTORY_RELEASES / WEARABLE_RELEASES (types/withdrawables.ts) —
 *    коллекционки и одежда с датой открытия торговли (tradeAt в будущем =
 *    ещё не торгуется; записи CAN_WITHDRAW_AND_TRADE = торгуются с 2023).
 *  - PET_NFT_REVEAL_CONFIG (types/petRevealConfig.ts) — окна торговли
 *    NFT-питомцев по id-диапазонам (tradeAt может ссылаться на endDate главы
 *    из chapters.ts — резолвим). Buds торгуются все.
 *
 * Страница истории цен фильтрует списки этими данными вместо эвристики
 * «не было сделок N дней» — исключения определены игрой, а не активностью рынка.
 *
 * Требует клон sunflower-land (npm run sfl:clone). Только пишет generated-файл,
 * в БД не лезет.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { extractTopLevelEntries, extractTopLevelKeys } from './lib/sprite-map';

const SFL_DIR = process.argv.includes('--sfl-dir')
  ? process.argv[process.argv.indexOf('--sfl-dir') + 1]
  : path.resolve('./_sfl_temp');

const OUT_FILE = path.resolve('./src/lib/tradeableData.generated.ts');

function readSfl(...rel: string[]): string {
  return fs.readFileSync(path.join(SFL_DIR, ...rel), 'utf8');
}

/**
 * Тело объекта const-объявления `export const NAME ... = { ... }` с балансировкой
 * скобок. extractNamedBlock из sprite-map тут не подходит: слово TRADE_LIMITS
 * встречается в строке-комментарии выше объявления, и он извлекает чужой блок.
 * Комментарии предварительно вырезаем: апостроф в «Leather's values» иначе
 * читается как открывающая кавычка строки и ломает подсчёт скобок.
 */
function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      out += c;
      i++;
      while (i < source.length) {
        out += source[i];
        if (source[i] === '\\') { out += source[i + 1] ?? ''; i += 2; continue; }
        if (source[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function extractConstObjectBlock(source: string, name: string): string {
  const clean = stripComments(source);
  const decl = new RegExp(`export\\s+const\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^=]*=\\s*[\\{\\[]`).exec(clean);
  if (!decl) return '';
  const openChar = decl[0].slice(-1);
  const closeChar = openChar === '{' ? '}' : ']';
  const start = decl.index + decl[0].length;
  let depth = 1;
  let i = start;
  while (i < clean.length && depth > 0) {
    const c = clean[i];
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      i++;
      while (i < clean.length && clean[i] !== q) {
        if (clean[i] === '\\') i++;
        i++;
      }
    } else if (c === openChar) {
      depth++;
    } else if (c === closeChar) {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return clean.slice(start, i);
}

// ─── TRADE_LIMITS (торгующиеся ресурсы) ─────────────────────────────────────

function parseTradeLimits(): Record<string, number> {
  const src = readSfl('src/features/game/actions/tradeLimits.ts');
  const limits: Record<string, number> = {};
  // Спред ...EMBLEM_TRADE_LIMITS внутри TRADE_LIMITS извлекатель ключей
  // пропускает — эмблемы добираем отдельным объявлением.
  for (const name of ['TRADE_LIMITS', 'EMBLEM_TRADE_LIMITS']) {
    const block = extractConstObjectBlock(src, name);
    for (const key of extractTopLevelKeys(block)) {
      // Ключи с пробелами/апострофами в исходнике в кавычках — кавычка опциональна.
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = block.match(new RegExp(`(?<![\\w$])"?${escaped}"?:\\s*(\\d+)`));
      if (m) limits[key] = Number(m[1]);
    }
  }
  return limits;
}

// ─── Релизы коллекционок и одежды ───────────────────────────────────────────

interface TradeRelease { name: string; tradeAt: string }

const DEFAULT_TRADE_AT = '2023-01-01T00:00:00.000Z'; // CAN_WITHDRAW_AND_TRADE

function parseReleases(source: string, blockName: string): TradeRelease[] {
  const block = extractConstObjectBlock(source, blockName);
  // extractTopLevelEntries отдаёт только объектные значения; скалярные
  // (`X: CAN_WITHDRAW_AND_TRADE`) и есть записи с дефолтной датой — берём их
  // разницей по полному списку ключей.
  const objectEntries = new Map(extractTopLevelEntries(block).map((e) => [e.key, e.block]));
  const out: TradeRelease[] = [];
  for (const key of extractTopLevelKeys(block)) {
    const body = objectEntries.get(key);
    if (body == null) {
      out.push({ name: key, tradeAt: DEFAULT_TRADE_AT });
      continue;
    }
    const m = body.match(/tradeAt:\s*new Date\("([^"]+)"\)/);
    if (m) out.push({ name: key, tradeAt: m[1] });
    // tradeAt обязателен в Releases — если его нет, запись не про торговлю.
  }
  return out;
}

// ─── Окна торговли питомцев ─────────────────────────────────────────────────

interface PetWindow { startId: number; endId: number; tradeAt: string | null }

function parseChapterEndDates(source: string): Map<string, string> {
  const block = extractConstObjectBlock(source, 'CHAPTERS');
  const out = new Map<string, string>();
  const re = /"([^"]+)":\s*{[^{}]*?endDate:\s*new Date\("([^"]+)"\)/gs;
  for (const m of block.matchAll(re)) out.set(m[1], m[2]);
  return out;
}

function parsePetWindows(): PetWindow[] {
  const src = readSfl('src/features/game/types/petRevealConfig.ts');
  const chapterEnds = parseChapterEndDates(readSfl('src/features/game/types/chapters.ts'));
  const block = extractConstObjectBlock(src, 'PET_NFT_REVEAL_CONFIG');

  const out: PetWindow[] = [];
  // Объекты конфига простые (нет вложенных объектов) — режем по top-level `{...}`.
  const objRe = /\{([^{}]+)\}/g;
  for (const m of block.matchAll(objRe)) {
    const body = m[1];
    const startId = body.match(/startId:\s*(\d+)/)?.[1];
    const endId = body.match(/endId:\s*(\d+)/)?.[1];
    if (!startId || !endId) continue;
    const direct = body.match(/tradeAt:\s*new Date\("([^"]+)"\)/)?.[1];
    const chapterRef = body.match(/tradeAt:\s*CHAPTERS\["([^"]+)"\]\.endDate/)?.[1];
    const tradeAt = direct ?? (chapterRef ? chapterEnds.get(chapterRef) ?? null : null);
    out.push({ startId: Number(startId), endId: Number(endId), tradeAt });
  }
  return out.sort((a, b) => a.startId - b.startId);
}

// ─── Генерация ──────────────────────────────────────────────────────────────

function tsString(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const tradeLimits = parseTradeLimits();
const withdrawablesSrc = readSfl('src/features/game/types/withdrawables.ts');
const collectibles = parseReleases(withdrawablesSrc, 'INVENTORY_RELEASES');
const wearables = parseReleases(withdrawablesSrc, 'WEARABLE_RELEASES');
const petWindows = parsePetWindows();

const lines: string[] = [];
lines.push('/**');
lines.push(' * СГЕНЕРИРОВАНО scripts/sync-tradeable-data.ts из исходников sunflower-land — не править руками.');
lines.push(' * Что разрешено торговать на маркетплейсе по коду игры:');
lines.push(' *  - TRADE_RESOURCE_LIMITS — ресурсы (TRADE_LIMITS), имя → лимит листинга;');
lines.push(' *  - TRADEABLE_COLLECTIBLES / TRADEABLE_WEARABLES — предметы с датой открытия торговли (tradeAt);');
lines.push(' *  - PET_NFT_TRADE_WINDOWS — окна торговли питомцев по id, tradeAt null = только после конфига.');
lines.push(' * Обновление: npm run sfl:sync-tradeable (после npm run sfl:clone).');
lines.push(' */');
lines.push('');
lines.push('export interface TradeRelease {');
lines.push('  name: string;');
lines.push('  /** ISO-дата, с которой предмет открыт для торговли. */');
lines.push('  tradeAt: string;');
lines.push('}');
lines.push('');
lines.push('export interface PetTradeWindow {');
lines.push('  startId: number;');
lines.push('  endId: number;');
lines.push('  /** ISO-дата открытия торговли; null — конфиг не задал (не торгуется). */');
lines.push('  tradeAt: string | null;');
lines.push('}');
lines.push('');
lines.push('export const TRADE_RESOURCE_LIMITS: Record<string, number> = {');
for (const [name, limit] of Object.entries(tradeLimits).sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`  ${tsString(name)}: ${limit},`);
}
lines.push('};');
lines.push('');
lines.push('export const TRADEABLE_COLLECTIBLES: TradeRelease[] = [');
for (const e of collectibles.sort((a, b) => a.name.localeCompare(b.name))) {
  lines.push(`  { name: ${tsString(e.name)}, tradeAt: ${tsString(e.tradeAt)} },`);
}
lines.push('];');
lines.push('');
lines.push('export const TRADEABLE_WEARABLES: TradeRelease[] = [');
for (const e of wearables.sort((a, b) => a.name.localeCompare(b.name))) {
  lines.push(`  { name: ${tsString(e.name)}, tradeAt: ${tsString(e.tradeAt)} },`);
}
lines.push('];');
lines.push('');
lines.push('export const PET_NFT_TRADE_WINDOWS: PetTradeWindow[] = [');
for (const w of petWindows) {
  lines.push(`  { startId: ${w.startId}, endId: ${w.endId}, tradeAt: ${w.tradeAt ? tsString(w.tradeAt) : 'null'} },`);
}
lines.push('];');
lines.push('');

fs.writeFileSync(OUT_FILE, lines.join('\n'));
console.log(`tradeableData.generated.ts: ресурсов ${Object.keys(tradeLimits).length}, коллекционок ${collectibles.length}, одежды ${wearables.length}, окон питомцев ${petWindows.length}`);
