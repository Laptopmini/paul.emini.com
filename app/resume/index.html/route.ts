import { SITE_URL } from '@/lib/brand';
import { asset } from '@/lib/paths';

// /resume moved into the landing page. GitHub Pages can't send a 301, so this stub
// redirects at once (which search engines treat as permanent) and keeps the anchor:
// /resume/#smartthings → /#smartthings. Plain HTML, no app shell.
export const dynamic = 'force-static';

export function GET() {
  const home = asset('/');
  const target = `${home}#resume`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Résumé moved</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${new URL('/', SITE_URL).href}">
<script>location.replace(${JSON.stringify(home)} + (location.hash || '#resume'));</script>
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body>
<p>The résumé is now on the <a href="${target}">home page</a>.</p>
</body>
</html>
`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}
