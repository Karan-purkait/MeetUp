// backend/src/models/user.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the user schema
const userSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // ✅ adds createdAt and updatedAt
  }
);

// OPTIONAL: ensure indexes are built (useful in dev/tests)
userSchema.index({ email: 1 }, { unique: true });

// Compile the model
const User = mongoose.model('User', userSchema);
export default User;
