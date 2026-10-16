import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRecommendations } from '@/content';
import { asset } from './paths';

export * from '@/content';

export const recommendations = parseRecommendations(
  readFileSync(join(process.cwd(), 'content', 'recommendations.md'), 'utf8'),
);

export const RESUME_PDF = asset('/resume.pdf');
