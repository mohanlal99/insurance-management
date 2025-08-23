import jwt from 'jsonwebtoken'
// Gernate token a function Helper function 
export const generateToken = (user, time) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: time || "7d" }
  );
};