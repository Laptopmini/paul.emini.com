import { describe, expect, it } from 'vitest';
import type { Contribution } from './cards';
import {
  contributionPill,
  experienceLabel,
  readingMinutes,
  splitLead,
  splitSummary,
  splitTitle,
  topOwners,
} from './resume';

const contribution = (repo: string, kind: 'pr' | 'issue' = 'pr', state = 'merged') =>
  ({ repo, kind, state }) as Contribution;

describe('static page values', () => {
  it('rounds experience down to a multiple of five', () => {
    expect(experienceLabel([{ start: '2018-03' }, { start: '2015-01' }], '2026-10')).toBe(
      '10+ yrs',
    );
    expect(experienceLabel([{ start: '2010-11' }], '2026-10')).toBe('15+ yrs');
    expect(experienceLabel([{ start: '2023-01' }], '2026-10')).toBe('3 yrs');
  });

  it('ranks open-source owners by contribution count', () => {
    const list = [
      contribution('run-llama/llama_index'),
      contribution('CopilotKit/CopilotKit'),
      contribution('CopilotKit/docs'),
      contribution('ag-ui-protocol/ag-ui'),
      contribution('run-llama/llama_index'),
      contribution('CopilotKit/CopilotKit'),
      contribution('cnoon/x'),
    ];
    expect(topOwners(list, { 'run-llama': 'LlamaIndex' })).toEqual([
      'CopilotKit',
      'LlamaIndex',
      'ag-ui-protocol',
    ]);
  });

  it('splits a title on its first colon', () => {
    expect(splitTitle('The Unified Journey: rebuilding: how')).toEqual([
      'The Unified Journey:',
      'rebuilding: how',
    ]);
    expect(splitTitle('No colon')).toEqual(['No colon', null]);
  });

  it('splits the summary into its lead-in sentence and the rest', () => {
    expect(splitSummary('Senior dev with 10+ years. Expert in React. More.')).toEqual([
      'Senior dev with 10+ years.',
      'Expert in React. More.',
    ]);
    expect(splitSummary('One sentence.')).toEqual(['One sentence.', '']);
  });

  it('estimates reading time', () => {
    expect(readingMinutes(['one two'])).toBe(1);
    expect(readingMinutes([Array(690).fill('word').join(' ')])).toBe(3);
  });

  it('labels contributions with the kind and state', () => {
    expect(contributionPill(contribution('a/b'))).toEqual({ label: 'PR · merged', tone: 'merged' });
    expect(contributionPill(contribution('a/b', 'pr', 'open')).tone).toBe('open');
    expect(contributionPill(contribution('a/b', 'issue', 'closed'))).toEqual({
      label: 'Issue · closed',
      tone: 'issue',
    });
  });

  it('splits a bullet into its bold lead and the rest', () => {
    expect(splitLead('**Fewer drop-offs,** with more partners finishing.')).toEqual([
      'Fewer drop-offs,',
      'with more partners finishing.',
    ]);
    expect(splitLead('No lead here.')).toEqual([null, 'No lead here.']);
  });
});
