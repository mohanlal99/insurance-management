# InsuranceManagement_System

## Project Goal:
---
To develop a comprehensive backend solution that manages insurance policies, facilitates claims processing, and enhances customer engagement through effective communication.

---

## Authentication (Auth)
---
Authentication is implemented using **JWT (JSON Web Token)** for secure user login and session handling.

### Features:
- **Register User** → Allows new users to sign up with their details.
- **Login User** → Authenticates existing users and provides a JWT token.
- **Middleware Protection** → Validates JWT for accessing protected routes.

### Required Fields:
- **Register**
  - `name`: String (required)
  - `email`: String, unique (required)
  - `password`: String (required, hashed)
  - `role`: String (e.g., `admin`, `agent`, `user`) → default: `user`

- **Login**
  - `email`: String (required)
  - `password`: String (required)

### API Endpoints:
- **POST** `/api/auth/register` → Register new user  
- **POST** `/api/auth/login` → Login user & return JWT  
- **Protected Routes** → Use `Authorization: Bearer <token>` in headers  

### Example JWT Response:
```json
{
  "message": "Login successful",
  "token": "your_jwt_token_here"
}
```

## Policy
---
Manages all insurance policies in the system.

### Features:
- Create new policies with details.
- Retrieve all policies or a single policy by ID.
- Update or delete existing policies.

### Required Fields:
- `policyNumber`: String, unique (required)
- `policyType`: String (e.g., Health, Life, Vehicle) (required)
- `premiumAmount`: Number (required)
- `coverageAmount`: Number (required)
- `startDate`: Date (required)
- `endDate`: Date (required)

### API Endpoints:
- **POST** `/api/policies` → Create a new policy  
- **GET** `/api/policies` → Get all policies  
- **GET** `/api/policies/:id` → Get policy by ID  
- **PUT** `/api/policies/:id` → Update policy details  
- **DELETE** `/api/policies/:id` → Delete a policy  


## Customer Policies
---
Handles policies that customers purchase and manage.

### Features:
- Customers can purchase a policy (creates a `CustomerPolicy` record).
- Each purchased policy starts with status **pending_payment**.
- Retrieve all purchased customer policies.
- Retrieve a single customer policy by its ID.


### Required Fields:
- `customerId`: Auto login user
- `policyId`: ObjectId → Reference to Policy (required)
- `paymentFrequency`: String → monthly, quarterly, yearly, **default**: monthly

### API Endpoints:
- **POST** `/api/customer-policies` → Create a new customer policy (purchase)  
- **GET** `/api/customer-policies` → Get all customer policies  
- **GET** `/api/customer-policies/:id` → Get a customer policy by ID  
- **POST** `/api/customer-policies/:id/pay` → Pay premium for an issued policy
- **PUT** `/api/customer-policies/:id/renew` Renew an issued/expired policy
- **PUT** `/api/customer-policies//:id/cancel` → Cancel an issued policy

### Example Customer Policy Flow:
1. Customer purchases a policy → record created with status **pending_payment**.  
2. After payment confirmation → status changes to **active**.  
3. On expiry → status automatically moves to **expired**.  


## Claims
---
Handles customer insurance claims and manages the complete claim lifecycle.

### Features:
- Customers can create a new claim for their purchased policies.
- Customers can view and update their claims (only when status is `pending`).
- Agents can move claims to review.
- Admins can approve or reject claims.
- Customers (if pending) and Admins can delete claims.

### Required Fields:
- `customerPolicyId`: ObjectId → Reference to CustomerPolicy (required)
- `description`: String (required)
- `claimAmount`: Number (required)
- `status`: String → `pending`, `in_review`, `approved`, `rejected` (default: `pending`)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

### API Endpoints:

- **POST** `/api/claims` → Create a new claim *(Customer only)*  
- **GET** `/api/claims/my` → Get my claims *(Customer only)*  
- **GET** `/api/claims` → Get all claims *(Admin & Agent only)*  
- **GET** `/api/claims/:id` → Get claim by ID *(Customer owns OR Admin/Agent any)*  
- **PUT** `/api/claims/:id` → Update a claim (only if `pending`) *(Customer only)*  
- **PUT** `/api/claims/:id/review` → Move claim to review *(Agent only)*  
- **PUT** `/api/claims/:id/approve` → Approve claim *(Admin only)*  
- **PUT** `/api/claims/:id/reject` → Reject claim *(Admin only)*  
- **DELETE** `/api/claims/:id` → Delete claim *(Customer if pending, Admin any)*  

### Example Claim Flow:
1. Customer creates a claim → claim saved with status **pending**.  
2. Agent reviews claim → status changes to **in_review**.  
3. Admin approves/rejects claim → status changes to **approved** or **rejected**.  
4. Approved claims can trigger a **transaction** (payment to customer).


## Transactions
---
Handles all financial activities related to customer policies, claims, and wallet operations.

### Features:
- System records **claim payouts** when an admin approves a claim.  
- Supports **refunds** (e.g., policy cancellations).  
 
- Admins can manage and track all transactions.  
- Customers can view their personal transaction history.  

### Required Fields:
- `customer`: ObjectId → Reference to User (required)  
- `customerPolicy`: ObjectId → Reference to CustomerPolicy (optional, required for premium payments)  
- `claim`: ObjectId → Reference to Claim (optional, required for claim payouts)  
- `amount`: Number (required, must be ≥ 0)  
- `transactionType`: String → `premium_payment`, `claim_payout`, `refund`, `wallet_topup` (required)  
- `paymentMethod`: String → `credit_card`, `debit_card`, `upi`, `net_banking`, `wallet` (required)  
- `status`: String → `pending`, `success`, `failed` (default: `pending`)  
- `referenceId`: String (required, unique, e.g., payment gateway transaction ID)  
- `remarks`: String (optional, e.g., *"Monthly premium for Policy #1234"*)  


### API Endpoints:

- **POST** `/api/transactions` → Create a new transaction *(Customer only)*  
- **GET** `/api/transactions/my` → Get my transactions *(Customer only)*  
- **GET** `/api/transactions` → Get all transactions *(Admin only)*  
- **GET** `/api/transactions/:id` → Get transaction by ID *(Customer owns OR Admin any)*  
- **PUT** `/api/transactions/:id/status` → Update transaction status *(Admin / Payment Gateway Webhook)*  

### Example Transaction Flow:
1. Customer pays premium → new transaction saved with status **pending**.  
2. Payment gateway confirms success → status updated to **success**.  
3. If payment fails, transaction marked as **failed**.  
4. Admin approves claim → new transaction created as **claim_payout**.  
5. Customer can see all past transactions under **My Transactions**. 


## Premium Transactions
---
Handles customer premium payments for purchased policies, including installments, retries, cancellations, and refunds.

### Features:
- Customers can initiate payments for their policy premiums.  
- Supports **installment payments** (monthly, quarterly, yearly, etc.).  
- Payment status tracked (`initiated`, `pending`, `success`, `failed`, `refunded`).  
- Admins can **verify, refund, or cancel** premium transactions.  
- System automatically updates the **CustomerPolicy** (e.g., activating policy after first successful payment, updating `nextPaymentDue`, etc.).  
- Supports **invoice generation** and **receipt download** for customers.  

### Required Fields:
- `customer`: ObjectId → Reference to User (required)  
- `customerPolicy`: ObjectId → Reference to CustomerPolicy (required)  
- `amount`: Number (required, must be ≥ 0)  
- `totalAmount`: Number (optional, for full policy term payments)  
- `currency`: String (default: `"INR"`)  
- `transactionType`: String → `premium_payment` (default)  
- `isInstallment`: Boolean (default: false)  
- `installmentNumber`: Number (e.g., 1 for first installment)  
- `totalInstallments`: Number (if installment-based)  
- `installmentAmount`: Number (amount per installment)  
- `dueDate`: Date (when installment is due)  
- `provider`: String (e.g., Razorpay, Stripe)  
- `providerPaymentId`: String (gateway transaction ID)  
- `referenceId`: String (unique, required)  
- `status`: String → `initiated`, `pending`, `success`, `failed`, `refunded` (default: `initiated`)  
- `failureReason`: String (optional, for failed payments)  
- `invoiceNo`: String (unique, for receipt tracking)  
- `receiptUrl`: String (link to download invoice/receipt)  
- `remarks`: String (optional, e.g., *"First installment for Policy #1234"*)  

### API Endpoints:

- **POST** `/api/premium/initiate` → Initiate a premium payment *(Customer only)*  
- **POST** `/api/premium/verify` → Verify payment after gateway callback *(Admin/Provider only)*  
- **POST** `/api/premium/retry/:transactionId` → Retry a failed payment *(Customer only)*  
- **POST** `/api/premium/refund/:transactionId` → Refund a payment *(Admin only)*  
- **POST** `/api/premium/cancel/:transactionId` → Cancel a pending premium payment *(Customer only, before success)*  
- **GET** `/api/premium/invoice/:transactionId` → Generate invoice/receipt *(Customer & Admin)*  
- **GET** `/api/premium/:transactionId` → Get premium transaction details *(Customer owns OR Admin any)*  
- **GET** `/api/premium/customer/:customerId` → Get all premium transactions for a customer *(Customer & Admin)*  

### Example Premium Payment Flow:
1. Customer initiates premium payment → new transaction saved with status **initiated**.  
2. Gateway processes payment → status changes to **pending**.  
3. If gateway confirms success → status changes to **success**, and policy is activated (if first payment).  
4. If gateway fails → status changes to **failed** (customer can retry).  
5. Admin can **refund** or **cancel** transactions if required.  
6. Customer can download **invoice/receipt** for successful payments.  
7. System updates `CustomerPolicy.nextPaymentDue` for installment-based payments.  
