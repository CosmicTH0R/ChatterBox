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
    email: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
      sparse: true, // Recommended for optional unique fields
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // exclude password from query results by default
    },
    name: {
      type: String,
      trim: true,
      default: "", // Good to have a default
    },
    avatarUrl: {
      type: String,
      default: "", // Good to have a default
    },

    // --- (START) PHASE 7: FRIEND SYSTEM FIELDS ---
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sentFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    receivedFriendRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // --- (END) PHASE 7: FRIEND SYSTEM FIELDS ---
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
  // We need to fetch the password explicitly since it's 'select: false'
  const user = await mongoose.model("User").findById(this._id).select("+password");
  return await bcrypt.compare(enteredPassword, user.password);
};

// Export model
const User = mongoose.model("User", UserSchema);
export default User;