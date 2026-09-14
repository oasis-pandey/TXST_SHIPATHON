import { createProfileQueue, type ProfileQueue } from './profile-queue';

const SAMPLE_PROFILES = [
  { name: 'Maya', age: 24, distance: '2 miles away', bio: 'Ceramics on Sundays, spicy noodles always. Looking for someone to make ordinary days feel like an adventure.', tags: ['Ceramics', 'Foodie', 'Live music'], image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1100&q=85', color: '#C77869' },
  { name: 'Jordan', age: 26, distance: '5 miles away', bio: 'Bookstore browser, amateur pasta maker, and the friend who always plans the next road trip.', tags: ['Books', 'Pasta', 'Road trips'], image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=85', color: '#927BB2' },
  { name: 'Sofia', age: 25, distance: '3 miles away', bio: 'Chasing the best coffee in town and saying yes to sunrise hikes.', tags: ['Coffee', 'Outdoors', 'Design'], image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=1100&q=85', color: '#B17953' },
] as const;

export function createSampleProfileQueue(): ProfileQueue {
  return createProfileQueue(SAMPLE_PROFILES);
}
