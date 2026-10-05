import { ApiError } from '../utils/apiError.js';

export const demoUsers = [
  { userId: 'R001', name: 'Demo Ranger', role: 'RANGER' },
  { userId: 'M001', name: 'Demo Park Manager', role: 'PARK_MANAGER' },
  {
    userId: 'C001',
    name: 'Demo Community Liaison Officer',
    role: 'COMMUNITY_LIAISON_OFFICER',
  },
] as const;
export function findDemoUser(userId: string) {
  const user = demoUsers.find((candidate) => candidate.userId === userId);
  if (!user) throw new ApiError(404, 'Demo user not found');
  return user;
}
