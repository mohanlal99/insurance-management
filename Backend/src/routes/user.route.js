import e from "express";
import { User } from "../models/User.js";

export const userRoute = e.Router();


// User profile route
userRoute.get("/profile", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // remove password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ success: true, data: user || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Logout user route
userRoute.post('/logout', async (req, res) => {
  try {
     res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
