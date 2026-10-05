import { User } from '../models/User.js';
import { demoUsers } from '../services/demoUsers.js';

export async function seedDemoUsers() {
  for (const user of demoUsers) {
    await User.updateOne(
      { userId: user.userId },
      { $set: user },
      { upsert: true, runValidators: true },
    );
  }
}
