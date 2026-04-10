# ON-IT Innovation Ideas Platform

A web application for internal teams to submit and manage innovation ideas. Team members can submit their ideas and categorize them by type (internal/external/process/technology, etc.).

## Features

- 💡 **Submit Innovation Ideas**: Easy-to-use form for submitting new ideas
- 📊 **Categorization**: Classify ideas by:
  - **Category**: Internal, External, Process, Technology, Customer Experience, Product, Other
  - **Type**: Cost Reduction, Revenue Growth, Efficiency Improvement, Quality Enhancement, New Initiative, Risk Mitigation
- 👀 **View & Filter Ideas**: Browse all submitted ideas with filtering options
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🔒 **Anonymous Submissions**: Option to submit anonymously or with your name

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Data Storage**: JSON file-based storage
- **Dependencies**: express, body-parser, cors, express-rate-limit
- **Security**: Rate limiting, input sanitization, XSS protection

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/VladStoenescu/ON-IT.git
cd ON-IT
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. The application will be running and ready to use!

## Application Structure

```
ON-IT/
├── server.js           # Express server and API endpoints
├── public/             # Frontend files
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Styling
│   └── script.js       # Client-side JavaScript
├── data/               # Data storage directory
│   └── ideas.json      # JSON file storing all ideas
├── package.json        # Node.js project configuration
└── README.md          # This file
```

## API Endpoints

### GET /api/ideas
Retrieve all submitted ideas.

**Response**: Array of idea objects

### POST /api/ideas
Submit a new innovation idea.

**Request Body**:
```json
{
  "title": "Idea Title",
  "description": "Detailed description",
  "category": "Technology",
  "type": "Efficiency Improvement",
  "submittedBy": "John Doe" // Optional
}
```

**Response**: Created idea object

### GET /api/ideas/:id
Retrieve a specific idea by ID.

**Response**: Single idea object

## Deployment

### DigitalOcean App Platform (recommended)

The application is deployed on [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform) with the GitHub repository linked for automatic deployments.

The `.do/app.yaml` file in this repository contains the App Platform spec. DigitalOcean reads this file automatically when the app is connected to the repository.

**How it works:**

1. Every push to the `main` branch triggers an automatic build and deploy on App Platform (`deploy_on_push: true`).
2. App Platform runs `npm ci --omit=dev` to install production dependencies and `npm start` to launch the server.
3. The platform injects the `PORT` environment variable. The server already reads `process.env.PORT` so no manual configuration is required.
4. A health check is performed against `GET /health` to confirm the deployment is healthy before traffic is routed to it.

**Connecting the repository to a new App Platform app:**

1. In the [DigitalOcean control panel](https://cloud.digitalocean.com/apps), click **Create App**.
2. Choose **GitHub** as the source and select this repository and the `main` branch.
3. DigitalOcean will detect `.do/app.yaml` and pre-fill the configuration — review and confirm.
4. Click **Create Resources** to create the app.

**Optional: monitor deployments from GitHub Actions**

The CI/CD workflow (`.github/workflows/deploy.yml`) validates that the app builds and the server starts on every push and pull request. If you also want it to wait for the App Platform deployment to finish and surface the result in the workflow run, add two repository secrets:

| Secret | Description |
|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | A DigitalOcean personal access token with read scope |
| `DIGITALOCEAN_APP_ID` | The App Platform app ID (visible in the app URL: `https://cloud.digitalocean.com/apps/<APP_ID>`) |

When both secrets are present the `deploy` job polls the deployment status and fails the workflow if the deployment ends in an error state. Without the secrets the job simply prints a notice and exits successfully — App Platform will still deploy automatically via `deploy_on_push`.

> **Data persistence:** The `.do/app.yaml` spec includes a persistent volume named `on-it-data` mounted at `/data`. All JSON data files are written there (via the `DATA_DIR=/data` environment variable), so they survive deployments and container restarts. The volume is provisioned automatically when the app is first created from this spec.

## Configuration

You can change the server port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Admin password

The built-in admin account (`vlad.stoenescu@on-point.com`) is created on first boot with the password defined by the `ADMIN_PASSWORD` environment variable. If the variable is not set the server falls back to the default password `Admin@2024!` and logs a warning.

**Set a strong password before going live.** In the DigitalOcean App Platform dashboard navigate to *Settings → Environment Variables* and add `ADMIN_PASSWORD` as an **Encrypted** variable. You only need to set it once; the password hash is stored in the persistent volume and is never overwritten by subsequent deployments.

> On every deployment the server ensures the admin account exists and that its section permissions are up-to-date with all currently deployed features. User accounts created by the admin also persist across deployments because they are stored in the same persistent volume (`/data/users.json`).

## Data Persistence

All data is stored as JSON files in the directory pointed to by the `DATA_DIR` environment variable (defaults to `data/` relative to `server.js` when not set).

When deployed to DigitalOcean App Platform the `.do/app.yaml` spec mounts a persistent volume at `/data` and sets `DATA_DIR=/data`, so all data files survive deployments and container restarts.

### User accounts

User accounts are stored in `users.json` inside `DATA_DIR`. Because this file lives on the persistent volume:

- **All user accounts created via the Admin panel survive redeployments** — no users are ever deleted by a deployment.
- The admin account is guaranteed to exist after every deployment; its section permissions are automatically kept in sync with any newly released features.
- Active login sessions (stored in `sessions.json`) also survive redeployments, so users do not need to log in again after an update as long as their session has not expired (sessions last 7 days).

The files stored include ideas, employees, onboarding templates & processes, training templates & assignments, IT landscape, IT assets, employee skills, skill categories, CRM contacts, CRM deals, process ownership, partnerships, meetings, evaluations, open positions, outlook items, users, and sessions.

Each idea record includes:

- **id**: Unique identifier
- **title**: Idea title
- **description**: Detailed description
- **category**: Selected category
- **type**: Selected type
- **submittedBy**: Submitter name (or "Anonymous")
- **submittedAt**: Submission timestamp
- **status**: Current status (default: "Pending")

## Security Notes

- **Rate Limiting**: API endpoints are protected with rate limiting:
  - General API endpoints: 100 requests per 15 minutes per IP
  - Submission endpoint: 20 requests per 15 minutes per IP
- **Input Sanitization**: All user inputs are sanitized on the frontend to prevent XSS attacks
- **CORS**: Cross-Origin Resource Sharing is enabled for API access
- **HTML Escaping**: All user inputs are escaped before display in the browser
- **Async I/O**: Non-blocking file operations for better performance and security
- **Directory Permissions**: Data directory created with secure permissions (0o755)
- **Collision-Resistant IDs**: Unique ID generation using timestamp + random string

## Future Enhancements

- User authentication and authorization
- Idea voting and commenting system
- Admin panel for managing ideas
- Email notifications
- Database integration (PostgreSQL/MongoDB)
- Export ideas to CSV/PDF
- Idea status workflow (Pending → Under Review → Approved/Rejected)
- Search functionality

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for innovation**
