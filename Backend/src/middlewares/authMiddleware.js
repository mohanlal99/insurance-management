import jwt from "jsonwebtoken";

export const authMiddleware = async (req, res, next) => {
  try {
    // Check authorization headers exists

    let token;

    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers?.authorization?.split(" ")[1]) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Authorization token missing" });
    }

    // decode token and get the user details
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decode user details update in request
    req.user = decoded;
    // Pass to the next function
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// role middleware

export function roleMiddleware(req, res, next) {
  
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    else if (user.role === "agent" || user.role === "admin") {
      next();
    }
    else
    return res.status(403).json({ message: "Forbidden: Insufficient role" });
  
}

export function adminMiddleware(req, res, next) {
  
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    else if (user.role === "admin") {
      next();
    }
    else
    return res.status(403).json({ message: "Forbidden: Insufficient role" });
  
}
