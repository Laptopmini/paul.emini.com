import { github } from '@/content';

// Publishes the daily GitHub snapshot as /github.json, so the agent Worker picks up a
// fresh one without being redeployed (worker/src/github-data.ts).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(github);
}
