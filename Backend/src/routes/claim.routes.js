import e from "express";
import { adminMiddleware, roleMiddleware } from "../middlewares/authMiddleware.js";
import { approveClaim, createClaim, deleteClaim, getAllClaims, getClaimById, getMyClaims, moveClaimToReview, rejectClaim, updateClaim } from "../controllers/claim.controller.js";


export const claimRoute = e.Router();

// Customer create new claim
claimRoute.post("/", createClaim); // role user

// Customer get my claims
claimRoute.get("/my", getMyClaims);  // role user

// Admin & Agent get all claims
claimRoute.get("/", roleMiddleware, getAllClaims);

// All (Customer owns, Admin/Agent any) get claim by ID
claimRoute.get("/:id", getClaimById);

// Customer update claim (if pending)
claimRoute.put("/:id", updateClaim);

// Agent move claim to review
claimRoute.put("/:id/review", moveClaimToReview);

// Admin approve claim
claimRoute.put("/:id/approve", adminMiddleware, approveClaim);

// Admin reject claim
claimRoute.put("/:id/reject", adminMiddleware,rejectClaim);

// Customer (pending) & Admin delete claim
claimRoute.delete("/:id", deleteClaim);
