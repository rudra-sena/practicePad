// Ready-made prompts for the "paste this in your Claude chat" helper lines.
export const P = {
  addSchools: 'Using Mastercraft, add my schools: [school names], [round], for the [year] intake.',
  profileFromCv: 'Using Mastercraft, set up my profile from my CV (attached). Extract my details and stories only.',
  fillGaps: 'Using Mastercraft, ask me a few short questions to fill the gaps in my profile and stories.',
  storyDetail: (title) => `Using Mastercraft, ask me short questions to add detail to my story "${title}".`,
  planEssay: (school, title) => `Using Mastercraft, plan the structure of my ${school} ${title}.`,
  reviewEssay: (school, title) => `Using Mastercraft, review my ${school} ${title} (latest draft).`,
  finalCheck: (school) => `Using Mastercraft, run the final check on my ${school} application.`,
  planRec: (name, school) => `Using Mastercraft, plan ${name}'s recommendation answers for ${school}.`,
  updateSchool: (school) => `Using Mastercraft, update ${school}: [what changed].`,
};
