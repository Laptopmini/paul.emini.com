import { describe, expect, it } from 'vitest';
import { linkify } from './linkify';

const allow = { hosts: ['github.com', 'www.linkedin.com'], emails: ['paul@emini.com'] };

describe('linkify', () => {
  it('links bare and full URLs on allowed hosts, leaving trailing punctuation outside', () => {
    expect(linkify('The repo is github.com/Laptopmini/paul.emini.com.', allow)).toEqual([
      'The repo is ',
      {
        href: 'https://github.com/Laptopmini/paul.emini.com',
        label: 'github.com/Laptopmini/paul.emini.com',
      },
      '.',
    ]);
    expect(linkify('(https://www.linkedin.com/in/pvmini)', allow)).toEqual([
      '(',
      { href: 'https://www.linkedin.com/in/pvmini', label: 'https://www.linkedin.com/in/pvmini' },
      ')',
    ]);
  });

  it('links Paul’s email only', () => {
    expect(linkify('Write to paul@emini.com or x@evil.test', allow)).toEqual([
      'Write to ',
      { href: 'mailto:paul@emini.com', label: 'paul@emini.com' },
      ' or x@evil.test',
    ]);
  });

  it('keeps unknown domains, plain http and names like Next.js as text', () => {
    for (const text of ['See evil.example/login', 'http://github.com/x', 'Built with Next.js']) {
      expect(linkify(text, allow)).toEqual([text]);
    }
  });
});
