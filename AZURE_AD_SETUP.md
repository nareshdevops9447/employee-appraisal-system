# Microsoft Entra ID (Azure AD) Setup Guide for Employee Appraisal System

Follow these steps to register the application in the Azure Portal and configure Single Sign-On (SSO).

## 1. App Registration

1. Log in to the [Azure Portal](https://portal.azure.com/).
2. Search for **Microsoft Entra ID** (formerly Azure Active Directory).
3. In the left menu, select **App registrations** > **New registration**.
4. Fill in the form:
   - **Name**: `Employee Appraisal System (Dev)`
   - **Supported account types**: **Accounts in this organizational directory only (Single tenant)**
   - **Redirect URI (Web)**: `http://localhost:3000/api/auth/callback/microsoft-entra-id`
5. Click **Register**.

## 2. Platform Configuration

1. In your new app registration, go to **Authentication** in the left menu.
2. Under **Platform configurations**, ensure **Web** is added with the redirect URI above.
3. Add a **Front-channel logout URL**: `http://localhost:3000`
4. Under **Implicit grant and hybrid flows**, check both:
   - [x] **Access tokens (used for implicit flows)**
   - [x] **ID tokens (used for implicit and hybrid flows)**
5. Click **Save**.

## 3. Certificates & Secrets

1. Go to **Certificates & secrets**.
2. Click **New client secret**.
3. Description: `Dev Secret`
4. Expires: **6 months** (or as preferred).
5. Click **Add**.
6. **IMPORTANT**: Copy the **Value** (not the Secret ID) immediately. You will need this for the `.env` file.

## 4. API Permissions

1. Go to **API permissions**.
2. Click **Add a permission** > **Microsoft Graph** > **Delegated permissions**.
3. Select the following permissions:
   - `User.Read` (default)
   - `email`
   - `openid`
   - `profile`
4. Click **Add permissions**.
5. If possible, click **Grant admin consent for <Organization Name>** to suppress the consent prompt for users.

## 5. App Roles (RBAC)

To map Azure AD users to application roles (`employee`, `manager`, `hr_admin`, `super_admin`):

1. Go to **App roles**.
2. Create the following roles:

| Display name | Allowed member types | Value | Description |
|---|---|---|---|
| Employee | Users/Groups | `Employee` | Standard employee access |
| Manager | Users/Groups | `Manager` | Access to team appraisals |
| HR Admin | Users/Groups | `HR_Admin` | HR department access |
| Super Admin | Users/Groups | `Super_Admin` | Full system access |

3. Go to **Enterprise applications** > Search for your app > **Users and groups**.
4. Add users/groups and assign them the appropriate roles.

## 6. Token Configuration (Optional but Recommended)

1. Go to **Token configuration**.
2. Click **Add optional claim**.
3. Token type: **ID**
4. Select: `email`, `preferred_username`, `groups` (if using group-based logic).
5. Click **Add**.

## 7. Environment Variables configuration

Update your root `.env` file with the values from the **Overview** page:

```env
# Azure AD Config
AZURE_AD_TENANT_ID=<Directory (tenant) ID>
AZURE_AD_CLIENT_ID=<Application (client) ID>
AZURE_AD_CLIENT_SECRET=<Client Secret Value from Step 3>

# NextAuth Config
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<Generate a random string: openssl rand -base64 32>
```

## 8. Testing the Flow

1. Restart your Docker containers:
   ```bash
   docker compose down
   docker compose up -d --build
   ```
2. Go to `http://localhost:3000/login`.
3. Click **Sign in with Microsoft**.
4. Accept permissions (if not admin consented).
5. You should be redirected to the dashboard.
6. Check the browser console or network tab to see the session object containing your role and access token.
