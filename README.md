# StaffSync

Modern HR management app built with the MERN stack. Three roles (HR, manager, employee) with JWT login, attendance, leave approvals, announcements and animated dashboards.

## Demo accounts

Use these to try each role. The password is the same for all three.

| Role | Email | Password |
|---|---|---|
| HR | hr@staffsync.dev | Demo@1234 |
| Manager | manager@staffsync.dev | Demo@1234 |
| Employee | employee@staffsync.dev | Demo@1234 |

## Run locally

Backend:

    cd server
    copy .env.example .env
    npm i
    npm run seed
    npm run dev

Frontend (new terminal):

    cd client
    npm i
    npm run dev

Open http://localhost:5173

## Deploy

Client on Vercel (`VITE_API=https://<api>/api`), API on Render, database on MongoDB Atlas. Set `MONGO_URI`, `JWT_SECRET` and `CLIENT_URL` on the API.
