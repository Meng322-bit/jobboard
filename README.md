# Job Board Microservices Platform

Backend-only job board built as 7 microservices (Node.js, Express, MongoDB Atlas) with role-based JWT authentication, Docker, an Nginx load balancer, and deployment on 3 AWS EC2 instances.

Project for CLD 376 Cloud Native Development (midterm project).

**Team members:** Ing Menghong, Hong Sivhuy

## Roles

- **Employer:** posts and manages jobs, sees the applicants for their jobs, accepts or rejects them.
- **Seeker:** searches jobs, applies to a job, sees the status of their applications, withdraws an application.

## Microservices

All requests go through the API Gateway (port 5000). It checks the JWT and the role, then forwards the request to the right service.

| Service | Port | Access | What it does |
|---|---|---|---|
| api-gateway | 5000 | all | Single entry point, checks the JWT and the role |
| registration-service | 5001 | public | Register a user (employer or seeker) |
| login-service | 5002 | public | Log in, returns a JWT that contains the role |
| job-listing-service | 5003 | employer | Create, view, edit, delete own jobs |
| applicant-view-service | 5004 | employer | View applicants, accept or reject |
| job-search-service | 5005 | seeker | Browse and search jobs (two copies, behind Nginx) |
| application-service | 5006 | seeker | Apply to a job, view and withdraw own applications |
| nginx | 8080 | internal | Load balancer for job-search-service (round-robin) |

## API (through the gateway, http://localhost:5000)

Public

- `POST /register/userregister` (body: name, email, password, role `employer` or `seeker`, phone)
- `GET /register/checkemail?email=`
- `POST /auth/login` (body: email, password)
- `GET /auth/verify` (header: `Authorization: Bearer <token>`)

Employer (token with role employer)

- `GET /employer/jobs`, `POST /employer/jobs`, `PUT /employer/jobs/:id`, `DELETE /employer/jobs/:id`
- `GET /employer/applications` (optional `?status=` and `?jobId=`), `GET /employer/applications/:id`
- `PATCH /employer/applications/:id/status` (body: status `accepted` or `rejected`)

Seeker (token with role seeker)

- `GET /seeker/jobs` (optional `?title=`, `?location=`, `?category=`), `GET /seeker/jobs/:id`
- `POST /seeker/applications` (body: jobId), `GET /seeker/applications`, `DELETE /seeker/applications/:id`

A wrong or missing token returns 401. A valid token with the wrong role returns 403.

## Run locally with Docker

Requirements: Docker Desktop and a MongoDB Atlas database.

The `.env` files are not in this repository. Create a `.env` file in each service folder:

```
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<a long random secret, the same in every service>
```

The api-gateway folder only needs `JWT_SECRET`. Then run:

```
docker compose up --build
```

The gateway is at `http://localhost:5000`. Nginx is at `http://localhost:8080`, and the two Job Search copies are on ports 5005 and 5015. Each Job Search response includes a `servedBy` field, so you can see which copy answered.

## Deploy on 3 AWS EC2 instances

| Instance | Compose file | Services |
|---|---|---|
| EC2 #1 (gateway) | `docker-compose.gateway.yml` | api-gateway, nginx, registration, login |
| EC2 #2 (employer) | `docker-compose.employer.yml` | job-listing, applicant-view, job-search (copy 1) |
| EC2 #3 (seeker) | `docker-compose.seeker.yml` | application, job-search (copy 2) |

On each instance: install Docker and Git, clone this repository, create a `.env` file in the repository root (same two variables as above), then run:

```
docker compose -f docker-compose.gateway.yml up -d --build
```

(use the compose file that matches the instance). The private IP addresses in the compose files and in `nginx/nginx.ec2.conf` are the ones used in our test. Change them if you deploy on new instances. The security group must allow ports 5000 to 5015 and 8080.

## Tests

The project document (PDF) shows each API tested in Postman on the EC2 public IP, the MongoDB data, the load balancer, and the error tests (wrong password, invalid token, no token, wrong role, duplicate email).

## Notes

- Passwords are stored as bcrypt hashes. Tokens expire after 1 hour.
- All services share one MongoDB database (`jobboard`) with three collections: `users`, `jobs`, `applications`.
- `.env` files are excluded by `.gitignore` and `.dockerignore`, so secrets are not in the repository or in the Docker images.