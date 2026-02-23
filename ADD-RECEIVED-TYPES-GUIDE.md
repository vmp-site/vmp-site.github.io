# Add Received Payment - Type Selection Guide

## Overview
When adding received payments, you can now choose the source type, which determines how the "From" field is populated and connects to related profiles.

## Three Received Payment Types

### 1. **Other (Manual Entry)** - Default
- **Use when**: Money is received from external sources not in the system
- **How it works**: Manually enter the name/company name in the "From" field
- **Examples**: Loan repayment, investor contribution, other business clients
- **Profile Link**: None (not linked to any profile)

### 2. **👷 Worker** 
- **Use when**: Worker is returning advance payment or providing refund
- **How it works**:
  1. Select "Worker" from "From Type" dropdown
  2. A new dropdown "Select Worker" appears
  3. Choose the worker from the list
  4. Worker name auto-fills in the "From" field
- **Profile Link**: Automatically links to that worker's profile
  - Shows worker details, attendance history, payment history
  - Updates worker's wallet balance (received payment goes towards reducing what you owe)

### 3. **🏗️ Site**
- **Use when**: Site is making a payment or repaying advances
- **How it works**:
  1. Select "Site" from "From Type" dropdown
  2. A new dropdown "Select Site" appears
  3. Choose the site from the list
  4. Site name auto-fills in the "From" field
- **Profile Link**: Automatically links to that site's profile
  - Shows site details, attendance records from that site, payments received
  - Updates site's balance (received payment goes towards reducing what site owes)

## Form Fields Explained

### From Type * (Required)
The dropdown at the top of the form with three options:
- **Other (Manual Entry)** → Shows text input for "From (Name/Company)"
- **👷 Worker** → Shows worker selection dropdown
- **🏗️ Site** → Shows site selection dropdown

### Dynamic "From" Field
Based on the selected type:
- **Other**: Free text entry - type any name or company
- **Worker**: Auto-fills with selected worker's name
- **Site**: Auto-fills with selected site's name

### Other Fields (Same for all types)
- **Date** - When the payment was received
- **Amount** - How much was received (in ₹)
- **Payment Mode** - Cash, Bank Transfer, UPI, Cheque, Other
- **Note** - Optional notes about the payment

## How to Use

### Receive Payment from External Source
1. Click "➕ Add Received"
2. Keep "From Type" as "Other (Manual Entry)" (default)
3. Enter company name or person's name in "From" field
4. Fill in date, amount, payment mode
5. Click "Save Received Payment"

### Receive Payment from Worker
1. Click "➕ Add Received"
2. Change "From Type" to "👷 Worker"
3. Select worker from "Select Worker" dropdown
4. Worker name auto-fills - verify it's correct
5. Fill in date, amount, payment mode
6. Click "Save Received Payment"
7. Can now click worker name in received table → opens worker profile with updated balance

### Receive Payment from Site
1. Click "➕ Add Received"
2. Change "From Type" to "🏗️ Site"
3. Select site from "Select Site" dropdown
4. Site name auto-fills - verify it's correct
5. Fill in date, amount, payment mode
6. Click "Save Received Payment"
7. Can now click site name in received table → opens site profile with updated balance

## Data Flow

### Worker Type Flow
```
Add Received (Type: Worker)
    ↓
Select Worker: "Demo bhai"
    ↓
From field auto-fills: "Demo bhai"
    ↓
Submit → Database saves with worker_name = "Demo bhai"
    ↓
In Received Table: Worker name is clickable
    ↓
Click "Demo bhai" → worker-profile.html?id=123
    ↓
Worker Profile shows:
    - Attendance History
    - Payment History
    - Updated Wallet Balance (less money owed to worker)
```

### Site Type Flow
```
Add Received (Type: Site)
    ↓
Select Site: "Construction Site A"
    ↓
From field auto-fills: "Construction Site A"
    ↓
Submit → Database saves with site_name = "Construction Site A"
    ↓
In Received Table: Site name is clickable
    ↓
Click "Construction Site A" → site-profile.html?id=456
    ↓
Site Profile shows:
    - All attendance from that site
    - All received payments for that site
    - Updated Site Balance (less money site owes)
```

## Key Benefits

✅ **Data Integrity** - Using dropdowns ensures correct spelling and data consistency
✅ **Automatic Linking** - Worker/Site names auto-fill when selected
✅ **Profile Connection** - Payments link directly to related profiles
✅ **Balance Updates** - Received payments update worker/site wallet balance calculations
✅ **Flexibility** - "Other" type still available for external payments

## Technical Details

### Storage
- **From field always contains the name** (consistent format)
- Worker selection also stores the worker_id relationship
- Site selection also stores the site_id relationship
- This enables proper profile linking in the received table

### Validation
- **Other type**: Name must be entered manually
- **Worker type**: Worker must be selected from dropdown
- **Site type**: Site must be selected from dropdown
- All types require: Date, Amount, Payment Mode

## Mobile Responsive
- All three input methods work on mobile
- Dropdowns are touch-friendly
- Form layout adapts to screen size
- Modal dialog works on all devices

## Future Enhancements
- Bulk import of received payments
- Recurring payments from workers/sites
- Payment reconciliation
- Automatic balance settlement notifications
- Payment history filtering by type
