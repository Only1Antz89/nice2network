import type { BlueprintInput, BlueprintRole, ProjectBlueprint } from "./blueprint-schema";

const templates: Record<string, BlueprintRole[]> = {
  technology: [
    { phase: "now", department: "Engineering", title: "Full-stack engineer", headcount: 1, professions: ["Software engineer", "Full-stack developer"], requiredSkills: ["Software development"], usefulSkills: ["Cloud infrastructure", "Databases"], criticality: "critical", reason: "Build a dependable first version and connect the core product flows.", workMode: "remote" },
    { phase: "now", department: "Design", title: "Product designer", headcount: 1, professions: ["Product designer", "UX designer"], requiredSkills: ["Product design", "UX design"], usefulSkills: ["User research"], criticality: "important", reason: "Turn the project outcome into a clear, testable member experience.", workMode: "remote" },
    { phase: "next", department: "Product", title: "Product lead", headcount: 1, professions: ["Product manager"], requiredSkills: ["Product management"], usefulSkills: ["Roadmapping", "Facilitation"], criticality: "important", reason: "Coordinate delivery once the first build work is underway.", workMode: "hybrid" },
    { phase: "later", department: "Quality", title: "QA engineer", headcount: 1, professions: ["QA engineer", "Test engineer"], requiredSkills: ["Software testing"], usefulSkills: ["Test automation"], criticality: "important", reason: "Protect reliability before a public launch.", workMode: "remote" },
  ],
  community: [
    { phase: "now", department: "Community", title: "Community lead", headcount: 1, professions: ["Community manager"], requiredSkills: ["Community building"], usefulSkills: ["Facilitation"], criticality: "critical", reason: "Recruit participants and keep the work grounded in community needs.", workMode: "hybrid" },
    { phase: "now", department: "Operations", title: "Operations lead", headcount: 1, professions: ["Operations manager"], requiredSkills: ["Operations"], usefulSkills: ["Partnerships"], criticality: "important", reason: "Create the practical operating model needed for a useful pilot.", workMode: "hybrid" },
    { phase: "next", department: "Finance", title: "Finance adviser", headcount: 1, professions: ["Finance manager", "Accountant"], requiredSkills: ["Financial planning"], usefulSkills: ["Fundraising"], criticality: "important", reason: "Test affordability and long-term sustainability after the pilot is shaped.", workMode: "remote" },
  ],
  climate: [
    { phase: "now", department: "Product", title: "Product designer", headcount: 1, professions: ["Product designer"], requiredSkills: ["Product design"], usefulSkills: ["Service design"], criticality: "important", reason: "Translate the climate outcome into a practical service people can use.", workMode: "remote" },
    { phase: "now", department: "Engineering", title: "Technical lead", headcount: 1, professions: ["Software engineer", "Data engineer"], requiredSkills: ["Software development"], usefulSkills: ["Data engineering"], criticality: "critical", reason: "Build the technical foundation and validate the data flow.", workMode: "remote" },
    { phase: "next", department: "Partnerships", title: "Partnerships lead", headcount: 1, professions: ["Partnerships manager"], requiredSkills: ["Partnerships"], usefulSkills: ["Stakeholder management"], criticality: "important", reason: "Secure delivery partners once the concept is ready to pilot.", workMode: "hybrid" },
  ],
};

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();
const coveredByOwner = (role: BlueprintRole, input: BlueprintInput) => {
  const ownerTerms = [input.owner.profession, input.owner.industry, ...input.owner.rankedSkills, ...input.owner.careerSummary.map(item => item.title)].map(norm).filter(Boolean);
  const roleTerms = [...role.professions, ...role.requiredSkills, role.title].map(norm);
  return roleTerms.some(roleTerm => ownerTerms.some(ownerTerm => ownerTerm.includes(roleTerm) || roleTerm.includes(ownerTerm)));
};

export function fallbackBlueprint(input: BlueprintInput): ProjectBlueprint {
  const projectText = `${input.project.title} ${input.project.summary} ${input.project.description ?? ""}`.toLowerCase();
  const base = projectText.includes("weather") || projectText.includes("forecast")
    ? templates.technology
    : templates[norm(input.project.industry)] ?? templates.technology;
  const roles = base.filter(role => !coveredByOwner(role, input)).map(role => ({ ...role, workMode: input.project.workMode === "in_person" ? "in_person" as const : role.workMode }));
  const coveredContributions = [input.owner.profession, ...input.owner.rankedSkills].filter((value): value is string => Boolean(value)).slice(0, 4).map(value => ({ area: value, evidence: "Provided by the project owner’s profession or ranked skills." }));
  return {
    outcome: `Validate and deliver a useful first version of ${input.project.title}.`,
    assumptions: ["The owner will review and edit this rules-based starting point before publishing.", `The project is currently at the ${input.project.stage} stage.`],
    coveredContributions,
    milestones: [
      { title: "Confirm the outcome, users and measures of success", phase: "now" },
      { title: "Build and test a focused pilot", phase: "next" },
      { title: "Review evidence and prepare the next release", phase: "later" },
    ],
    gaps: roles.slice(0, 3).map(role => `${role.department}: ${role.title}`),
    risks: ["The proposed roles are a rules-based fallback and need owner review.", "Local candidate supply may require remote support."],
    roles: roles.length ? roles : [templates.technology[0]],
  };
}
