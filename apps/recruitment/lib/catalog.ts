export type Track = "CORE_TEAM" | "COMMITTEE" | "MEMBER";

export type Opportunity = {
  id: string;
  track: Track;
  department: string;
  title: string;
  specialization?: string;
  description: string;
  scenario: string;
  capacity: number | null;
  icon: string;
};

const departments = [
  {
    key: "finance",
    name: "Finance and Resource",
    role: "Co-Finance Head",
    description:
      "Turn resources into possibilities. Help the team plan budgets, document expenses, and make every contribution count.",
    scenario:
      "How would you document a small event budget and handle an expense without a receipt?",
    icon: "wallet",
  },
  {
    key: "secretariat",
    name: "Secretariat",
    role: "Executive Secretary",
    description:
      "Bring clarity to the big picture. Keep decisions, documents, and the team's next steps thoughtfully organized.",
    scenario:
      "How would you turn an unclear meeting discussion into accurate decisions and action items?",
    icon: "file",
  },
  {
    key: "operations",
    name: "Operations and Events",
    role: "Operations Secretary",
    description:
      "Make good ideas happen. Help organize welcoming events and keep the people behind them moving together.",
    scenario:
      "An event volunteer cancels shortly before registration opens. How would you respond?",
    icon: "calendar",
  },
  {
    key: "creatives",
    name: "Creatives and Graphics",
    role: "Vice Chief Creatives Officer",
    description:
      "Give our ideas a visual voice. Create thoughtful graphics and help the community tell a consistent story.",
    scenario:
      "Explain your approach to a readable recruitment graphic and keeping a team's designs consistent.",
    icon: "sparkles",
  },
  {
    key: "marketing",
    name: "Marketing and Management",
    role: "Marketing Secretary",
    description:
      "Connect the right story with the right people. Help more students discover what they can build with Alpha.",
    scenario:
      "Propose a simple campaign to reach students unfamiliar with cloud computing and explain how you would assess results.",
    icon: "megaphone",
  },
  {
    key: "relations",
    name: "Relations and Communications",
    role: "Vice Chief Relations Officer",
    description:
      "Build bridges beyond the classroom. Nurture partnerships and make every conversation feel like an open door.",
    scenario:
      "How would you introduce Alpha to a prospective community partner and follow up professionally?",
    icon: "people",
  },
];

export const opportunities: Opportunity[] = [
  { id: "general-member", track: "MEMBER", department: "Alpha Community", title: "General Member",
    description: "Learn with peers, join community activities, and grow your cloud skills together.",
    scenario: "How would you contribute to a welcoming learning community and support another member who is new to cloud computing?",
    capacity: null, icon: "people" },
  ...departments.map((d) => ({
    id: `core-${d.key}`,
    track: "CORE_TEAM" as const,
    department: d.name,
    title: d.role,
    description: d.description,
    scenario: d.scenario,
    capacity: 1,
    icon: d.icon,
  })),
  ...departments.map((d) => ({
    id: `committee-${d.key}`,
    track: "COMMITTEE" as const,
    department: `${d.name} Committee`,
    title: "Committee Member",
    description: d.description,
    scenario: d.scenario,
    capacity: 8,
    icon: d.icon,
  })),
  ...[
    {
      key: "cloud",
      title: "Cloud",
      scenario:
        "Describe a beginner cloud project you want to build and how you would learn what you need.",
    },
    {
      key: "ai",
      title: "AI/ML",
      scenario:
        "Describe a practical AI/ML learning project and how you would check its output and use data responsibly.",
    },
    {
      key: "web",
      title: "Web Development",
      scenario:
        "Describe a web feature you want to build and how you would make it usable on a phone.",
    },
  ].map((s) => ({
    id: `skillbuilders-${s.key}`,
    track: "COMMITTEE" as const,
    department: "SkillBuilders Department",
    title: "Committee Member",
    specialization: s.title,
    description:
      "Learn by building, together. Explore hands-on projects, share what you discover, and grow your technical confidence.",
    scenario: s.scenario,
    capacity: s.key === "cloud" ? 1 : 8,
    icon: "code",
  })),
  {
    id: "buildher",
    track: "COMMITTEE",
    department: "BuildHer+ Department",
    title: "Ambassador",
    description:
      "Make room for more voices in technology. Champion inclusive learning and help beginners find their community.",
    scenario:
      "Propose an inclusive activity that supports participation in technology and explain how you would welcome beginners.",
    capacity: 4,
    icon: "heart",
  },
];

export const getOpportunity = (id: string) =>
  opportunities.find((o) => o.id === id);
export const opportunityLabel = (o?: Opportunity) =>
  o
    ? o.specialization
      ? `${o.specialization} · SkillBuilders`
      : o.track === "CORE_TEAM" || o.track === "MEMBER"
        ? o.title
        : o.id === "buildher"
          ? "BuildHer+ Ambassador"
          : o.department
    : "Choose your opportunity";
export const trackLabel = (track: Track) =>
  track === "CORE_TEAM" ? "Core Team" : track === "MEMBER" ? "Member" : "Committee";

export const questionIds = [
  "motivation",
  "collaboration",
  "availability",
  "pathway",
  "scenario",
] as const;
export type QuestionId = (typeof questionIds)[number];
export type Profile = {
  fullName: string;
  preferredName: string;
  email: string;
  mobile: string;
  university: string;
  otherUniversity: string;
  campus: string;
  program: string;
  programLevel: string;
  year: string;
  yearExplanation: string;
  enrolled: boolean;
  availability: string[];
  experience: string;
};

export const wordCount = (value: string) =>
  value.trim() ? value.trim().split(/\s+/u).length : 0;
export const normalizePhone = (value: string) => value.replace(/[\s().-]/g, "");
export function isCoreEligible(profile: Profile) {
  return (
    profile.enrolled &&
    profile.programLevel === "undergraduate" &&
    ["1", "2"].includes(profile.year)
  );
}
export function questionsFor(opportunityId: string, formVersion = 1) {
  const opportunity = getOpportunity(opportunityId);
  if (formVersion === 2) return [
    { id: "motivation" as const, label: "Why Alpha?", prompt: "Why do you want to join Alpha, and what would you like to contribute?", min: 1, max: 150 },
    { id: "collaboration" as const, label: "Working together", prompt: "Tell us about a time you worked with others or handled a challenge. School and personal projects count.", min: 1, max: 150 },
    { id: "scenario" as const, label: "Put yourself in the role", prompt: opportunity?.scenario ?? "Choose an opportunity to see your role scenario.", min: 1, max: 150 },
  ];
  return [
    {
      id: "motivation" as const,
      label: "Your reason for joining",
      prompt: "Why do you want to join Alpha and contribute through this role?",
      min: 50,
      max: 200,
    },
    {
      id: "collaboration" as const,
      label: "Better, together",
      prompt:
        "Describe a time you collaborated or handled a challenge, including school or personal projects.",
      min: 50,
      max: 200,
    },
    {
      id: "availability" as const,
      label: "A commitment you can keep",
      prompt:
        "What commitment can you realistically sustain alongside your studies?",
      min: 20,
      max: 100,
    },
    {
      id: "pathway" as const,
      label: "Your contribution",
      prompt:
        opportunity?.track === "CORE_TEAM"
          ? `How would you support and mentor a team through the ${opportunity.title} role?`
          : `What would you like to contribute and learn through ${opportunityLabel(opportunity)}?`,
      min: 50,
      max: 250,
    },
    {
      id: "scenario" as const,
      label: "Put yourself in the role",
      prompt:
        opportunity?.scenario ??
        "Choose an opportunity to see your role scenario.",
      min: 50,
      max: 250,
    },
  ];
}
