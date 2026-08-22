/** Join an article's metadata half to its body half on `path`. */

import { INSIGHT_META_BY_PATH } from './manifest';
import type { InsightBody, InsightContent } from './types';

export function insightContent(body: InsightBody): InsightContent {
  const meta = INSIGHT_META_BY_PATH[body.path];
  if (!meta) throw new Error(`No insight metadata registered for ${body.path}`);
  return { ...meta, ...body };
}
