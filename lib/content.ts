import { profile } from '@/content';
import { asset } from './paths';

export * from '@/content';

export const RESUME_PDF = asset('/resume.pdf');

/** The content test guarantees the full name starts with the first name. */
export const surname = profile.name.slice(profile.firstName.length).trim();
