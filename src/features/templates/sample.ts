import type { ResumeContent } from "@/features/resumes/schema";

// Fictional person, used only for template thumbnails.
export const SAMPLE_CONTENT: ResumeContent = {
  personal: {
    name: "Amara Okafor",
    headline: "Product Designer",
    email: "amara.okafor@example.com",
    phone: "+234 801 234 5678",
    location: "Lagos, Nigeria",
    linkedin: "linkedin.com/in/amaraokafor",
    website: "amara.design",
  },
  summary:
    "Product designer with four years of experience shaping fintech and logistics apps used by over 200,000 people. I work closely with engineers and researchers to turn messy workflows into calm, simple screens.",
  experience: [
    {
      id: "s_exp1",
      title: "Product Designer",
      company: "Paylane",
      location: "Lagos",
      start: "2022-03",
      end: "",
      current: true,
      bullets: [
        { id: "s_b1", text: "Redesigned merchant onboarding, cutting drop-off from 41% to 23% in two quarters." },
        { id: "s_b2", text: "Built and maintain the design system used across three product teams." },
        { id: "s_b3", text: "Run fortnightly usability sessions with small-business owners." },
      ],
    },
    {
      id: "s_exp2",
      title: "UI Designer",
      company: "Shiplink",
      location: "Remote",
      start: "2020-06",
      end: "2022-02",
      current: false,
      bullets: [
        { id: "s_b4", text: "Designed the driver app's delivery flow, now used for 30,000 deliveries a week." },
        { id: "s_b5", text: "Partnered with support to turn the top ten complaints into product fixes." },
      ],
    },
  ],
  education: [
    {
      id: "s_edu1",
      school: "University of Lagos",
      degree: "B.Sc.",
      field: "Computer Science",
      start: "2015-09",
      end: "2019-07",
      details: "",
    },
  ],
  skills: ["Figma", "Design systems", "User research", "Prototyping", "Usability testing", "HTML & CSS"].map(
    (name, i) => ({ id: `s_sk${i}`, name }),
  ),
  projects: [
    {
      id: "s_pr1",
      name: "Open Transit Lagos",
      url: "github.com/amara/open-transit",
      description: "Volunteer redesign of a community bus-route finder.",
      bullets: [],
    },
  ],
  certifications: [
    { id: "s_c1", name: "Google UX Design Certificate", issuer: "Coursera", date: "2021-05", url: "" },
  ],
};
