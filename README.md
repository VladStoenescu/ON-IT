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

The application is deployed to a DigitalOcean droplet via SSH using GitHub Actions on every push to the `main` branch.

| Variable | Value |
|---|---|
| `SSH_HOST` | `134.122.80.196` |
| `SSH_USERNAME` | `root` |
| `SSH_PRIVATE_KEY` | Stored as a GitHub repository secret (`SSH_PRIVATE_KEY`) |

The deployment script clones or updates the repository at `/opt/on-it`, installs production dependencies, and manages the process with PM2 (with automatic rollback on failure).

### Setting up the SSH_PRIVATE_KEY secret

1. **Generate a dedicated deploy key** on your local machine (or the server):
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key
   ```
   This creates two files: `deploy_key` (private) and `deploy_key.pub` (public).

2. **Authorize the public key on the droplet** (run on the server):
   ```bash
   cat deploy_key.pub >> ~/.ssh/authorized_keys
   ```

3. **Add the private key as a GitHub repository secret**:
   - Go to **Settings → Secrets and variables → Actions** in the repository.
   - Click **New repository secret**.
   - Name: `SSH_PRIVATE_KEY`
   - Value: paste the **entire contents** of the `deploy_key` file, including the
     `-----BEGIN OPENSSH PRIVATE KEY-----` header and `-----END OPENSSH PRIVATE KEY-----` footer.

4. **Delete the local key files** after adding the secret:
   ```bash
   rm deploy_key deploy_key.pub
   ```

> **Important:** Store the *private* key (`deploy_key`), not the public key (`deploy_key.pub`). The workflow validates the secret format on every run and will fail with a descriptive error if the key is missing or malformed.

## Configuration

You can change the server port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Data Persistence

All ideas are stored in `data/ideas.json`. Each idea includes:

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
