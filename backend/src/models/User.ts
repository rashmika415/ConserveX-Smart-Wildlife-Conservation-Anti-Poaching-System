import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['RANGER', 'PARK_MANAGER', 'COMMUNITY_LIAISON_OFFICER'],
    },
  },
  { timestamps: true },
);
export const User = model('User', userSchema);
