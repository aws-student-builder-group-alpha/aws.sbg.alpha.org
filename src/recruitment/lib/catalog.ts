export type Track = "CORE_TEAM" | "COMMITTEE";

export type Opportunity = {
  id: string;
  track: Track;
  department: string;
  title: string;
  specialization?: string;
  description: string;
  scenario: string;
  capacity: number;
  icon: string;
};

const departments = [
  {
    key: "finance",
    name: "Finance and Resource",
    role: "Co-Finance Head",
    officerDescription:
      "Before a workshop, work with Operations to estimate the cost of materials, equipment, and other event needs. Compare actual spending with the budget, keep receipts and reimbursement records together, and flag missing documentation before the team closes out the event. Check which supplies Alpha already has before budgeting for new ones.",
    committeeDescription:
      "Collect quotes and receipts for event supplies, update the expense log, and help the finance officers track what Alpha has on hand. Flag price changes or missing receipts as they come up. After an event, match each expense to its supporting record so the team can reconcile the budget.",
    scenario:
      "How would you document a small event budget and handle an expense without a receipt?",
    icon: "wallet",
  },
  {
    key: "secretariat",
    name: "Secretariat",
    role: "Executive Secretary",
    officerDescription:
      "Prepare the agenda for Core Team meetings, record decisions, and note who owns each follow-up and when it is due. Share the minutes after the meeting and keep approved documents in a shared archive. If a decision is unclear, confirm it with the officers before adding it to the record.",
    committeeDescription:
      "Help assemble meeting materials and turn discussion notes into draft minutes for review. Once officers confirm a decision, file the approved minutes and update the follow-up list. When another team needs a record, point them to the current version.",
    scenario:
      "How would you turn an unclear meeting discussion into accurate decisions and action items?",
    icon: "file",
  },
  {
    key: "operations",
    name: "Operations and Events",
    role: "Operations Secretary",
    officerDescription:
      "Keep a working schedule for Alpha’s workshops and meetups, from setup and registration to the last session. Confirm venue or call details with the event lead and make sure each volunteer knows their assignment. On event day, update the schedule and tell the team when a speaker, room, or assignment changes.",
    committeeDescription:
      "Help get the room or online meeting ready, test equipment, and check in attendees. Follow the event schedule and tell the operations lead about delays or missing supplies. Afterward, help log attendance and note what the next event team should change.",
    scenario:
      "An event volunteer cancels shortly before registration opens. How would you respond?",
    icon: "calendar",
  },
  {
    key: "creatives",
    name: "Creatives and Graphics",
    role: "Vice Chief Creatives Officer",
    officerDescription:
      "Work with the Chief Creatives Officer to assign design requests and review drafts for recruitment, events, and workshops. Check that dates, venues, and sign-up instructions are easy to read on a phone and that the artwork follows Alpha’s visual guidelines. Keep shared templates and final files organized so other designers can pick up the work.",
    committeeDescription:
      "Turn event briefs into posters, social graphics, or slides using Alpha’s templates. Confirm event details with the requesting team, revise drafts after feedback, and save the editable files alongside the versions ready to post.",
    scenario:
      "Explain your approach to a readable recruitment graphic and keeping a team's designs consistent.",
    icon: "sparkles",
  },
  {
    key: "marketing",
    name: "Marketing and Management",
    role: "Marketing Secretary",
    officerDescription:
      "Plan how Alpha will promote recruitment and events to students who are new to the club. Keep a publishing calendar that lines up graphics, captions, and reminders with sign-up deadlines. After a campaign, review sign-ups and post engagement with the team to decide what to change next time.",
    committeeDescription:
      "Write captions and event announcements, check the date and sign-up link with the organizers, and help publish reminders on schedule. Bring recurring questions from students back to the Marketing team so the next post answers them up front.",
    scenario:
      "Propose a simple campaign to reach students unfamiliar with cloud computing and explain how you would assess results.",
    icon: "megaphone",
  },
  {
    key: "relations",
    name: "Relations and Communications",
    role: "Vice Chief Relations Officer",
    officerDescription:
      "Work with the Chief Relations Officer to connect Alpha with campus organizations, speakers, and other tech communities. For a joint event, confirm what each group will provide, who the contacts are, and when decisions are due. Brief Alpha’s event team on the arrangements and follow up with partners after the activity.",
    committeeDescription:
      "Find potential speakers or partner organizations for upcoming activities and draft invitations for review. Keep track of replies and follow-up dates. When a guest confirms, help send their schedule and joining instructions so they know where to go and whom to contact.",
    scenario:
      "How would you introduce Alpha to a prospective community partner and follow up professionally?",
    icon: "people",
  },
];

export const opportunities: Opportunity[] = [
  ...departments.map((d) => ({
    id: `core-${d.key}`,
    track: "CORE_TEAM" as const,
    department: d.name,
    title: d.role,
    description: d.officerDescription,
    scenario: d.scenario,
    capacity: 1,
    icon: d.icon,
  })),
  ...departments.map((d) => ({
    id: `committee-${d.key}`,
    track: "COMMITTEE" as const,
    department: `${d.name} Committee`,
    title: "Committee Member",
    description: d.committeeDescription,
    scenario: d.scenario,
    capacity: 8,
    icon: d.icon,
  })),
  ...[
    {
      key: "cloud",
      title: "Cloud",
      description:
        "Build a small AWS project with other SkillBuilders, such as hosting a static website or connecting an app to cloud storage. Check access settings and costs, and remove lab resources when you finish. Write down the setup and any problems you solved so another student can repeat the lab.",
      scenario:
        "Describe a beginner cloud project you want to build and how you would learn what you need.",
    },
    {
      key: "ai",
      title: "AI/ML",
      description:
        "Work with peers on a small project such as classifying a set of sample images. Use data you have permission to work with, try the model on examples it did not train on, and document where it gets things wrong. Share a demo or notebook that explains the results and their limits.",
      scenario:
        "Describe a practical AI/ML learning project and how you would check its output and use data responsibly.",
    },
    {
      key: "web",
      title: "Web Development",
      description:
        "Build and test web features with other SkillBuilders, from a project gallery to an event sign-up page. Check that the page works on a phone and with a keyboard, review changes with teammates, and leave setup instructions so someone else can run the project locally.",
      scenario:
        "Describe a web feature you want to build and how you would make it usable on a phone.",
    },
  ].map((s) => ({
    id: `skillbuilders-${s.key}`,
    track: "COMMITTEE" as const,
    department: "SkillBuilders Department",
    title: "Committee Member",
    specialization: s.title,
    description: s.description,
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
      "Help women, LGBTQIA+ students, and other underrepresented students take part in Alpha’s tech activities. Share workshop invitations that explain what beginners need to bring, welcome first-time attendees, and ask what made it hard to join or follow along. Bring that feedback to the team planning the next session.",
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
      : o.track === "CORE_TEAM"
        ? o.title
        : o.id === "buildher"
          ? "BuildHer+ Ambassador"
          : o.department
    : "Choose your opportunity";
export const trackLabel = (track: Track) =>
  track === "CORE_TEAM" ? "Core Team" : "Committee";

export const questionIds = [
  "motivation",
  "collaboration",
  "availability",
  "pathway",
  "scenario",
] as const;
export type QuestionId = (typeof questionIds)[number];
export type AvailabilityRange = { startDate: string; endDate: string; startTime: string; endTime: string };
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
  availability: string[] | AvailabilityRange;
  experience: string;
};

export function formatAvailability(availability: Profile["availability"], separator = ", ") {
  if (Array.isArray(availability)) return availability.join(separator);
  const { startDate, endDate, startTime, endTime } = availability;
  const dates = startDate === endDate ? startDate : [startDate, endDate].filter(Boolean).join(" to ");
  const times = [startTime, endTime].filter(Boolean).join(" to ");
  return [dates, times && `${times} Philippine time`].filter(Boolean).join(separator);
}

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
    { id: "motivation" as const, label: "Motivation and contribution", prompt: "Why do you want to join AWS Student Builder Group - Alpha, and what would you like to contribute?", min: 1, max: 150 },
    { id: "collaboration" as const, label: "Collaboration", prompt: "How have you worked with others or handled a challenge?", min: 1, max: 150 },
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
