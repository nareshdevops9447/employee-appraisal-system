
# Employee Appraisal System (EAS)

A comprehensive, full-stack Employee Appraisal System built with a microservices architecture. Features include role-based access control (RBAC), SSO authentication, appraisal workflows, goal management (OKRs), and reporting.

![Architecture Overview](https://placeholder-image-url.com/architecture)

## 🏗 Architecture

The system is composed of the following services:

| Service | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16 (App Router), React, TailwindCSS, shadcn/ui | The user interface for employees, managers, and admins. |
| **API Gateway** | Flask | Entry point for all specialized services. Handles JWT validation and routing. |
| **Auth Service** | Flask, PostgreSQL | Manages authentication, SSO (Azure AD), login, and token issuance. |
| **User Service** | Flask, PostgreSQL | Manages employee profiles, departments, and organizational hierarchy. |
| **Appraisal Service** | Flask, PostgreSQL | Manages review cycles, assessment workflows, and peer feedback. |
| **Goal Service** | Flask, PostgreSQL | Manages OKRs, progress tracking, and goal approvals. |

## 🚀 Prerequisites

- **Docker & Docker Compose**: For running the containerized services.
- **Node.js 18+**: For local frontend development (optional if using Docker).
- **Python 3.9+**: For local backend development (optional if using Docker).
- **Azure AD Tenant**: For SSO integration (optional, local login fallback available).

## 🛠 Quick Start

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd employee-appraisal-system
    ```

2.  **Configure Environment Variables:**
    Copy the example environment file and update it with your credentials.
    ```bash
    cp .env.example .env
    ```
    *See [AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md) for SSO configuration details.*

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    *The first run may take a few minutes to build images and initialize databases.*

4.  **Access the Application:**
    - **Frontend:** [http://localhost:3000](http://localhost:3000)
    - **API Gateway:** [http://localhost:5000](http://localhost:5000)

## 🔑 Default Credentials (Seeded)

The system is seeded with a demo organization.

| Role | Email | Password |
| :--- | :--- | :--- |
| **CEO** | `alice.smith@example.com` | `password` |
| **Director (HR)** | `bob.jones@example.com` | `password` |
| **Manager** | `charlie.brown@example.com` | `password` |
| **Employee** | `david.wilson@example.com` | `password` |

## 📂 Folder Structure

```
.
├── docker-compose.yml      # Orchestration for all services
├── frontend/               # Next.js Application
│   ├── src/app/            # App Router pages
│   ├── src/components/     # Reusable UI components
│   └── src/lib/            # Utilities and API clients
├── services/
│   ├── api-gateway/        # Central entry point
│   ├── auth-service/       # Authentication & SSO
│   ├── user-service/       # Profile management
│   ├── appraisal-service/  # Review workflows
│   └── goal-service/       # Goal tracking
└── AZURE_AD_SETUP.md       # SSO Configuration Guide
```

## ⚠️ Environment Variables

Refer to `.env.example` for the complete list. Key variables include:

- `NEXTAUTH_SECRET`: Secret for NextAuth session encryption.
- `JWT_SECRET_KEY`: Shared secret for verifying backend tokens.
- `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET`: For Microsoft Entra ID integration.
- `POSTGRES_USER` / `POSTGRES_PASSWORD`: Database credentials.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.
