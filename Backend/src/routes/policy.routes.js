import e from "express";
import { addPolicies, deletePolicy, getPolicies, getPoliciesById, updatePolicy } from "../controllers/policy.controller.js";


export const policiesRoute = e.Router()

// Add policy role by admin or agent 
policiesRoute.post('/' , addPolicies)

// Admin and agent can see the policy
policiesRoute.get('/', getPolicies)

policiesRoute.get('/:id', getPoliciesById)

policiesRoute.put('/:id', updatePolicy)

policiesRoute.delete('/:id', deletePolicy)