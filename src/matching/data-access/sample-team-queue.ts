/** Temporary local data for the team swipe experience; replace with team recommendations later. */
export type TeamDiscoveryItem = {
  id: string;
  name: string;
  description: string;
  projectIdea: string;
  imageUrl: string;
  techStack: string[];
  openSpots: number;
};

export const SAMPLE_TEAMS: TeamDiscoveryItem[] = [
  {
    id: 'team-civic-signal',
    name: 'Civic Signal',
    description: 'Building a campus tool that helps students find and act on local volunteering opportunities.',
    projectIdea: 'A clean mobile directory with personalized causes and event reminders.',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1100&q=85',
    techStack: ['Expo', 'TypeScript', 'Design'],
    openSpots: 2,
  },
  {
    id: 'team-study-buddy',
    name: 'Study Buddy',
    description: 'A small team making study planning feel less lonely and more achievable.',
    projectIdea: 'Match study sessions around shared classes, habits, and availability.',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1100&q=85',
    techStack: ['React Native', 'Supabase', 'UX research'],
    openSpots: 1,
  },
  {
    id: 'team-green-route',
    name: 'Green Route',
    description: 'Helping people choose lower-impact routes and habits around San Marcos.',
    projectIdea: 'A practical commute companion with friendly sustainability nudges.',
    imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1100&q=85',
    techStack: ['Maps', 'Data', 'Frontend'],
    openSpots: 2,
  },
];
