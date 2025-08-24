import e from "express";
import { addPolicies, deletePolicy, getPolicies, getPoliciesById, updatePolicy } from "../controllers/policy.controller.js";
import { roleMiddleware } from "../middlewares/authMiddleware.js";


export const policiesRoute = e.Router()

// Add policy role by admin or agent 
policiesRoute.post('/' ,roleMiddleware, addPolicies)

// Policy for everyone policy
policiesRoute.get('/', getPolicies)

// Policy for everyone by the id
policiesRoute.get('/:id', getPoliciesById)


policiesRoute.put('/:id', roleMiddleware, updatePolicy)

policiesRoute.delete('/:id',roleMiddleware, deletePolicy)