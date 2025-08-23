import bcrypt from "bcrypt";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required!"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, "Invalid email format!"],
    },
    gender : {type : String , enum: ['Male', "Female", "Other"], required : [true , "Gender is required"] },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, 
    },
    phone: {
      type: String,
      match: [/^\d{10}$/, "Not a valid phone number"],
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ["admin", "user", "agent"],
      default: "user",
    },  
    googleId: {
      type: String, 
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    avatar: {
      type: String,
      default: "https://static.vecteezy.com/system/resources/previews/022/014/159/non_2x/avatar-icon-profile-icon-member-login-isolated-vector.jpg"
    },
  },
  { timestamps: true }
);




userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next(); 
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


export const User =
  mongoose.models.User || mongoose.model("User", userSchema);