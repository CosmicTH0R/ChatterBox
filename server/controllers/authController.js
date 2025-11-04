// controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Register User
export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    // 2️⃣ Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 3️⃣ Create and save new user (password hashed by pre-save hook)
    const newUser = new User({ username, password });
    await newUser.save();

    // 4️⃣ Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
    });
  } catch (err) {
    console.error("Error in registerUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1️⃣ Validate input
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4️⃣ Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("Error in loginUser:", err);
    res.status(500).json({ message: "Server error" });
  }
};
