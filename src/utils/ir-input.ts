/**
 * IR 输入容错层：兼容聊天模型的常见输出习惯，让不同强度的模型都能一次编译通过。
 * - 剥离 ```json 围栏与前后说明文字
 * - 自动补齐缺失的 slides[].id
 * - 把相对路径的本地配图解析到 IR 文件所在目录（不再依赖当前工作目录或写死绝对路径）
 */
import fs from 'node:fs';
import path from 'node:path';

/** 从可能带 markdown 围栏或前后说明文字的模型输出中提取 JSON 正文 */
export function extractJsonText(raw: string): string {
  let text = raw.replace(/^﻿/, '').trim();

  for (const m of text.matchAll(/```[a-zA-Z]*[ \t]*\r?\n([\s\S]*?)\r?\n?```/g)) {
    const body = m[1].trim();
    if (body.startsWith('{')) {
      return body;
    }
  }

  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last > first) text = text.slice(first, last + 1);
  }
  return text;
}

export function parseIrText(raw: string): any {
  const text = extractJsonText(raw);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`IR 不是合法 JSON（已尝试剥离 markdown 围栏）: ${(err as Error).message}`);
  }
}

export interface FilledId {
  index: number;
  id: string;
}

/** 为缺失或为空的 slides[].id 补上 s01、s02…（原地修改），返回补齐记录 */
export function fillMissingSlideIds(deck: any): FilledId[] {
  const filled: FilledId[] = [];
  if (!deck || !Array.isArray(deck.slides)) return filled;

  const used = new Set<string>();
  for (const s of deck.slides) {
    if (s && typeof s.id === 'string' && s.id.trim()) used.add(s.id);
  }

  deck.slides.forEach((s: any, index: number) => {
    if (!s || typeof s !== 'object' || (typeof s.id === 'string' && s.id.trim())) return;
    let id = `s${String(index + 1).padStart(2, '0')}`;
    while (used.has(id)) id += '-x';
    used.add(id);
    s.id = id;
    filled.push({ index, id });
  });
  return filled;
}

const NON_FILE_SRC = /^(art:|data:|https?:|file:)/i;

/** 把 IR 中相对路径的本地文件 `src` 改写为以 baseDir 为基准的绝对路径（仅当文件确实存在时）。返回改写数量 */
export function rebaseRelativeAssetPaths(node: unknown, baseDir: string): number {
  let count = 0;
  if (Array.isArray(node)) {
    for (const child of node) count += rebaseRelativeAssetPaths(child, baseDir);
  } else if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (
        key === 'src' &&
        typeof value === 'string' &&
        value &&
        !NON_FILE_SRC.test(value) &&
        !path.isAbsolute(value)
      ) {
        const abs = path.resolve(baseDir, value);
        if (fs.existsSync(abs)) {
          obj[key] = abs;
          count++;
        }
      } else {
        count += rebaseRelativeAssetPaths(value, baseDir);
      }
    }
  }
  return count;
}

/** 读取 IR 文件：容错解析 + 相对配图路径基于 IR 所在目录解析 */
export function readIrFile(file: string): any {
  const abs = path.resolve(file);
  const deck = parseIrText(fs.readFileSync(abs, 'utf-8'));
  rebaseRelativeAssetPaths(deck, path.dirname(abs));
  return deck;
}
