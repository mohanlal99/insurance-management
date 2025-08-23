import e from "express";
import { generateToken } from "../services/tokenGernate.js";
import { User } from "../models/User.js";
import { Token } from "../models/TokenBlackList.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendMail } from "../services/mailer.js";

export const authRoute = e.Router();

// Register route
authRoute.post("/register", async (req, res) => {
  try {
    const { name, email, gender, password, phone } = req.body || {};

    if (!name || !email || !gender || !password) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided!" });
    }
    // Checking user is not exist already
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered!" });
    }

    // Create a user
    const user = new User({
      name,
      email,
      gender,
      password,
      phone,
    });
    // Save user in db
    await user.save();

    res.status(201).json({
      message: "User registered successfully!",
      user: {
        name: user.name,
        email: user.email,
        gender: user.gender,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Something went wrong during registration!",
    });
  }
});

// Login Route
authRoute.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email & password are required!" });
    }

    // Find the user from Mognodb
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }
    // console.log(user)
    // Using brypt check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials!" });
    }

    // Gernate a token help of jwt
    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Sent response success
    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Something went wrong during login!",
    });
  }
});

// Reset passwrod send link on email
authRoute.post("/reset", async (req, res) => {
  try {
    const { email } = req.body || {};
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // token gernate by crypto
    const token = crypto.randomBytes(32).toString("hex");

    await Token.create({
      token,
      userId: user._id,
      expiresAt: Date.now() + 1000 * 60 * 10, // valid 10 min
    });

    const url = `http://localhost:5050/reset-pass/q?token=${token}`;
    await sendMail(
      user.email,
      "Password Reset",
      `<a href="${url}">Click here to reset password</a>`
    );

    res
      .status(200)
      .json({ message: "Password reset link sent to your email!", url });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message || "Something went wrong!" });
  }
});

authRoute.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body || {};

    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc || tokenDoc.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword; // passwrod has will in user schema pre saveing
    await user.save();

    await Token.deleteOne({ token }); // cleanup

    res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message || "Something went wrong!" });
  }
});
