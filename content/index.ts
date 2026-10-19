import awardsJson from './awards.json';
import caseStudiesJson from './case-studies.json';
import certificationsJson from './certifications.json';
import educationJson from './education.json';
import experienceJson from './experience.json';
import githubJson from './github.json';
import mentionsJson from './mentions.json';
import metaJson from './meta.json';
import personasJson from './personas.json';
import profileJson from './profile.json';
import projectsJson from './projects.json';
import recommendationsMd from './recommendations.md';
import {
  awardsSchema,
  caseStudiesSchema,
  certificationsSchema,
  educationsSchema,
  experiencesSchema,
  githubSchema,
  mentionsSchema,
  metaSchema,
  personasSchema,
  profileSchema,
  projectsSchema,
  siteSchema,
  skillsSchema,
} from './schema';
import { parseRecommendations } from './schema/recommendations';
import siteJson from './site.json';
import skillsJson from './skills.json';

// Validated, typed content shared by the site and the worker. Parsing at import time
// means invalid content fails the build. recommendations.md is imported as text
// (Next: scripts/text-loader.cjs, Vitest: plugin in vitest.config.ts, Worker: wrangler Text rule).

export const profile = profileSchema.parse(profileJson);
export const skills = skillsSchema.parse(skillsJson);
export const experience = experiencesSchema.parse(experienceJson);
export const projects = projectsSchema.parse(projectsJson);
export const education = educationsSchema.parse(educationJson);
export const certifications = certificationsSchema.parse(certificationsJson);
export const awards = awardsSchema.parse(awardsJson);
export const github = githubSchema.parse(githubJson);
export const personas = personasSchema.parse(personasJson);
export const site = siteSchema.parse(siteJson);
export const meta = metaSchema.parse(metaJson);
export const caseStudies = caseStudiesSchema.parse(caseStudiesJson);
export const mentions = mentionsSchema.parse(mentionsJson);
export const DEFAULT_PERSONA = 'visitor' as const;

export type * from './schema';
export { parseRecommendations } from './schema/recommendations';
export const recommendations = parseRecommendations(recommendationsMd);
