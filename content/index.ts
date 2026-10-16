import awardsJson from './awards.json';
import certificationsJson from './certifications.json';
import educationJson from './education.json';
import experienceJson from './experience.json';
import githubJson from './github.json';
import personasJson from './personas.json';
import profileJson from './profile.json';
import projectsJson from './projects.json';
import {
  awardsSchema,
  certificationsSchema,
  educationsSchema,
  experiencesSchema,
  githubSchema,
  personasSchema,
  profileSchema,
  projectsSchema,
  skillsSchema,
} from './schema';
import skillsJson from './skills.json';

// Validated, typed content shared by the site and the worker. Parsing at import time
// means invalid content fails the build. recommendations.md is runtime-specific to load
// (fs in Next, a Text module in the worker): pass its text to `parseRecommendations`.

export const profile = profileSchema.parse(profileJson);
export const skills = skillsSchema.parse(skillsJson);
export const experience = experiencesSchema.parse(experienceJson);
export const projects = projectsSchema.parse(projectsJson);
export const education = educationsSchema.parse(educationJson);
export const certifications = certificationsSchema.parse(certificationsJson);
export const awards = awardsSchema.parse(awardsJson);
export const github = githubSchema.parse(githubJson);
export const personas = personasSchema.parse(personasJson);
export const DEFAULT_PERSONA = 'visitor' as const;

export type * from './schema';
export { parseRecommendations } from './schema/recommendations';
