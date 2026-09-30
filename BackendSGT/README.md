# SGT Backend

Passwordless OTP authentication for Souls Gather Together.

## Setup

1. Copy the Brevo and MongoDB values into `.env`.
2. Verify the Brevo sender address or domain.
3. Install dependencies with `npm install`.
4. Start development mode with `npm run dev`.

## Authentication routes

- `POST /api/auth/signup/request-otp` with `{ "email": "student@delhitechnicalcampus.ac.in" }`
- `POST /api/auth/signup/verify-otp` with `{ "email": "...", "otp": "123456" }`
- `POST /api/auth/login/request-otp` with `{ "email": "..." }`
- `POST /api/auth/login/verify-otp` with `{ "email": "...", "otp": "123456" }`
- `GET /api/auth/me` with `Authorization: Bearer <token>`
- `POST /api/auth/logout` with `Authorization: Bearer <token>`
- `GET /api/onboarding/status` with `Authorization: Bearer <token>`
- `GET /api/institutions` with `Authorization: Bearer <token>`
- `PATCH /api/profile/institution` with `{ "institutionId": "..." }` and `Authorization: Bearer <token>`
- `GET /api/profile` with `Authorization: Bearer <token>`
- `PATCH /api/profile` with basic profile fields and `Authorization: Bearer <token>`
- `GET /api/verification/review` with `Authorization: Bearer <token>`
- `POST /api/verification/submit` with `Authorization: Bearer <token>`
- `POST /api/profile/photo` with multipart field `photo` and `Authorization: Bearer <token>`
- `POST /api/verification/college-id` with multipart field `document` and `Authorization: Bearer <token>`

## Profile photo setup

Install the new backend dependencies:

```bash
npm install
```

Add real Cloudinary credentials to `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Add SambaNova credentials to `.env` for questionnaire profile tagging:

```env
SAMBANOVA_API_KEY=YOUR_SAMBANOVA_API_KEY
SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
SAMBANOVA_MODEL=DeepSeek-V3.1
```

Keep SambaNova credentials only in the backend environment. Do not create a
`VITE_SAMBANOVA_API_KEY`, because Vite variables are exposed to the browser.

Profile photos are held in memory during validation and uploaded to Cloudinary under `SGT/profile-photos`. No local `uploads` directory or image binary is created. Accepted formats are JPG, PNG, and WebP, with a 5 MB limit and minimum dimensions of 200x200 pixels.

College IDs are stored separately as private Cloudinary assets under `SGT/verification/college-ids`. V1 accepts JPG, JPEG, and PNG images up to 10 MB. The API returns only `PENDING` status and the next step; private Cloudinary references are never returned to the frontend.

## Verification lifecycle

Students submit from `/onboarding/review` and remain at `/verification/pending` while `verificationStatus` is `PENDING`. Admin access is separate at `/admin/login`; pending applications are reviewed through the protected admin API. Approval routes the student to `/questionnaire`, and only a completed questionnaire unlocks `/dashboard`.

## Live Photo setup

Install the QR package with the other backend dependencies:

```bash
npm install
```

Live Photo endpoints:

- `POST /api/verification/live-photo` with authenticated multipart field `photo`
- `POST /api/verification/live-session` with an authenticated request
- `POST /api/verification/live-session/connect?t=<temporary-token>` from the phone
- `GET /api/verification/live-session/:sessionId/status` with the authenticated laptop token
- `POST /api/verification/live-photo/mobile?t=<temporary-token>` with multipart field `photo`

Set `MOBILE_VERIFY_BASE_URL` to a URL reachable by the phone. `localhost` on the QR code refers to the phone itself, so use a LAN address or deployed frontend URL for mobile testing. QR tokens are random, hashed in MongoDB, valid for five minutes, single-use, and contain no user ID or credentials.

## Institutions and onboarding

Institutions are stored separately from user profiles. The frontend never owns a college list or sends a user ID. The authenticated token identifies the user, and the backend accepts only an existing active institution ID.

Seed the initial Delhi Technical Campus institution after configuring `.env`:

```bash
npm run seed:institution
```

The onboarding status response uses `nextStep: "college"` when no institution is selected and `nextStep: "profile-details"` after selection.

## OTP policy

- Six cryptographically secure numeric characters.
- Expires after 10 minutes and is single-use.
- A 60-second resend cooldown applies per email and purpose.
- Maximum 3 OTP requests per email and 10 per IP within 15 minutes.
- Login attempts themselves are not capped, per the product requirement.

The email limiter is process-local. Use a shared store such as Redis before deploying multiple backend instances.

## Install

```bash
npm install
```

The email provider package is `@getbrevo/brevo`.

## Test endpoints

Set a valid campus email in the commands below. Replace `YOUR_OTP` with the code received by email and `YOUR_TOKEN` with the token returned after verification.

```bash
# Health check
curl http://localhost:5000/health

# Request signup OTP
curl -X POST http://localhost:5000/api/auth/signup/request-otp -H "Content-Type: application/json" -d '{"email":"student@delhitechnicalcampus.ac.in"}'

# Verify signup OTP
curl -X POST http://localhost:5000/api/auth/signup/verify-otp -H "Content-Type: application/json" -d '{"email":"student@delhitechnicalcampus.ac.in","otp":"YOUR_OTP"}'

# Request login OTP
curl -X POST http://localhost:5000/api/auth/login/request-otp -H "Content-Type: application/json" -d '{"email":"student@delhitechnicalcampus.ac.in"}'

# Verify login OTP
curl -X POST http://localhost:5000/api/auth/login/verify-otp -H "Content-Type: application/json" -d '{"email":"student@delhitechnicalcampus.ac.in","otp":"YOUR_OTP"}'

# Current user
curl http://localhost:5000/api/auth/me -H "Authorization: Bearer YOUR_TOKEN"

# Logout
curl -X POST http://localhost:5000/api/auth/logout -H "Authorization: Bearer YOUR_TOKEN"
```
