import type { UserRecommendationProfile } from "./profile-queue";

export const SAMPLE_PROFILES = [
  {
    id: "a7c0177c-2699-4c8a-8e31-c651830342d1",
    display_name: "Maya",
    bio: "Frontend developer who enjoys ceramics, spicy noodles, and pairing thoughtful product design with reliable UI systems.",
    avatar_url:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85",
    github_url: "https://github.com/maya-example",
    skill_level: "Intermediate",
    availability: "Available evenings and weekends",
    discovery_mode: "people",
    tech_stack: ["React", "TypeScript", "Expo"],
    interests: ["Design systems", "Accessibility"],
    preferred_roles: ["Frontend", "Product design"],
    created_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "b8a3b861-4092-4ea1-bbaa-d35debb20a2e",
    display_name: "Jordan",
    bio: "Backend-focused developer who likes turning product ideas into dependable APIs and data models.",
    avatar_url:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=85",
    github_url: "https://github.com/jordan-example",
    skill_level: "Advanced",
    availability: "Available for the full hackathon",
    discovery_mode: "both",
    tech_stack: ["Postgres", "Supabase", "Deno"],
    interests: ["Developer tools", "APIs"],
    preferred_roles: ["Backend", "Infrastructure"],
    created_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
  },
  {
    id: "c9e6ae62-7128-4c8b-a383-f2b43a08d2c7",
    display_name: "Sofia",
    bio: "Full-stack builder interested in shipping practical tools for local communities and student teams.",
    avatar_url:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1100&q=85",
    github_url: null,
    skill_level: "Intermediate",
    availability: "Available weekdays after 5 PM",
    discovery_mode: "teams",
    tech_stack: ["React Native", "Node.js", "Figma"],
    interests: ["Civic tech", "Outdoors"],
    preferred_roles: ["Full stack"],
    created_at: "2026-09-14T00:00:00.000Z",
    updated_at: "2026-09-14T00:00:00.000Z",
  },
] satisfies UserRecommendationProfile[];
