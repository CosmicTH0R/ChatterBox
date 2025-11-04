// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters long"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // exclude password from query results by default
    },
  },
  { timestamps: true }
);

// 🔒 Pre-save hook to hash password before saving
UserSchema.pre("save", async function (next) {
  // Only hash password if it was modified (or new)
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10); // 10 rounds is standard
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ Instance method for password verification
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Export model
const User = mongoose.model("User", UserSchema);
export default User;
