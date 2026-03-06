---
description: Steps to prepare the environment for a client demo
---

# Demo Preparation Workflow

Follow these steps to ensure a clean and professional demo environment.

1. **Start the Infrastructure**
   // turbo
   ```powershell
   docker-compose up -d
   ```

2. **Wait for Services**
   Wait for the frontend (port 3000) and backend (port 5000) to be healthy.

3. **Browse to Frontend**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Verify Seed Data**
   Try logging in with `alice.smith@example.com` / `password`.

5. **Reset Demo Data (Optional)**
   If you need to start fresh, run:
   // turbo
   ```powershell
   docker-compose down -v
   docker-compose up -d --build
   ```
