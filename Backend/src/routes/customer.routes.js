import e from "express";
import { cancelCustomerPolicy, createCustomerPolicy, getCustomerPolicies, getCustomerPolicyById, payPremium, renewCustomerPolicy } from "../controllers/customer.controller.js";


export const customerRoute = e.Router();

// Create/purchase a policy 
customerRoute.post("/", createCustomerPolicy);

// List policies for the logged-in user 
customerRoute.get("/", getCustomerPolicies);

// Get one issued policy by id
customerRoute.get("/:id", getCustomerPolicyById);

// Pay premium for an issued policy
customerRoute.post("/:id/pay", payPremium);

// Renew an issued/expired policy
customerRoute.put("/:id/renew", renewCustomerPolicy);

// Cancel an issued policy
customerRoute.put("/:id/cancel", cancelCustomerPolicy);
