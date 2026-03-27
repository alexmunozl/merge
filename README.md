# 🏨 Opera Profile Merger

AI-driven profile merging system for Opera Cloud via OHIP (Oracle Hospitality Integration Platform).

## 🎯 Overview

This system automatically detects and merges duplicate guest profiles in Opera Cloud, reducing data redundancy and improving guest experience. It uses sophisticated AI algorithms to identify potential duplicates while maintaining data integrity and providing complete audit trails.

## ✨ Key Features

### 🤖 AI-Powered Duplicate Detection
- **Name Similarity**: Jaro-Winkler distance algorithm for name matching
- **Contact Matching**: Email normalization and phone number standardization
- **Address Analysis**: Geocoding and address standardization
- **Confidence Scoring**: Weighted similarity scoring with configurable thresholds

### 🔄 Intelligent Merging
- **Native OHIP Integration**: Uses Oracle's built-in merge endpoints
- **Snapshot Preview**: Pre-merge validation and impact analysis
- **Survivor Selection**: Smart algorithm to choose the master profile
- **Master Profile Protection**: Keyword-based protection for important profiles

### 📊 Real-time Monitoring
- **Automated Polling**: Continuous monitoring for new profiles
- **Manual Review Dashboard**: Web interface for borderline cases
- **Audit Trail**: Complete history of all merge operations
- **Statistics & Reporting**: Comprehensive analytics and insights

### 🛡️ Enterprise Features
- **Docker Deployment**: Containerized architecture for easy deployment
- **Database Persistence**: PostgreSQL with full audit capabilities
- **API Documentation**: Swagger/OpenAPI documentation
- **Health Monitoring**: Built-in health checks and monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OHIP API      │    │   AI Engine     │    │   Database      │
│                 │    │                 │    │                 │
│ • Profiles      │◄──►│ • Similarity    │◄──►│ • Profiles      │
│ • Merge         │    │ • Scoring       │    │ • Merge Audit   │
│ • Search        │    │ • Validation    │    │ • Reviews       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Polling       │    │   Web Dashboard │    │   API Layer     │
│   Service       │    │                 │    │                 │
│                 │    │ • Manual Review │    │ • REST APIs     │
│ • Event Detection│    │ • Statistics    │    │ • WebSocket     │
│ • Batch Processing│   │ • Monitoring    │    │ • Documentation│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if not using Docker)
- OHIP API credentials

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd opera-profile-merger
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your OHIP credentials and configuration
```

3. **Deploy with Docker**
```bash
./scripts/deploy.sh
```

4. **Access the application**
- Web Interface: http://localhost
- API Documentation: http://localhost/api-docs
- Health Check: http://localhost/api/system/health

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OHIP_BASE_URL` | OHIP API base URL | Required |
| `OHIP_CLIENT_ID` | OHIP client ID | Required |
| `OHIP_CLIENT_SECRET` | OHIP client secret | Required |
| `OHIP_HOTEL_ID` | Hotel ID for OHIP requests | Required |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `AI_CONFIDENCE_THRESHOLD` | Minimum confidence for auto-merge | 0.85 |
| `POLLING_INTERVAL` | Polling interval in milliseconds | 300000 |
| `MASTER_PROFILE_KEYWORDS` | Keywords that protect profiles | MASTER_PROFILE,DO_NOT_MERGE |

### AI Thresholds

Configure the AI sensitivity through environment variables:

```bash
AI_CONFIDENCE_THRESHOLD=0.85          # Overall confidence threshold
AI_NAME_SIMILARITY_THRESHOLD=0.8      # Name matching threshold
AI_EMAIL_SIMILARITY_THRESHOLD=0.9     # Email matching threshold
AI_PHONE_SIMILARITY_THRESHOLD=0.85    # Phone matching threshold
AI_ADDRESS_SIMILARITY_THRESHOLD=0.8    # Address matching threshold
```

## 📖 API Documentation

### Core Endpoints

#### Profile Management
- `GET /api/profiles/{profileId}` - Get profile details
- `POST /api/profiles/search` - Search for profiles
- `GET /api/profiles/{profileId}/duplicates` - Find duplicates

#### Merge Operations
- `POST /api/merges/analyze` - Analyze potential merge
- `POST /api/merges/execute` - Execute merge
- `GET /api/merges/snapshot` - Get merge preview
- `GET /api/merges/history` - Get merge history

#### System Management
- `GET /api/polling/status` - Get polling status
- `POST /api/polling/start` - Start polling service
- `POST /api/polling/stop` - Stop polling service
- `GET /api/system/health` - System health check

### Example Usage

```javascript
// Search for potential duplicates
const response = await fetch('/api/profiles/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profileName: 'Smith',
    givenName: 'John',
    profileType: 'Guest'
  })
});

// Analyze merge potential
const analysis = await fetch('/api/merges/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    survivorProfileId: '12345',
    victimProfileId: '67890'
  })
});
```

## 🎛️ Web Dashboard

The web dashboard provides:

### 📊 Overview
- System statistics and health
- Recent merge activity
- Pending manual reviews
- Real-time polling status

### 🔍 Manual Review
- Review borderline merge cases
- Approve/reject with notes
- View detailed similarity analysis
- Compare profiles side-by-side

### 📈 Analytics
- Merge success rates
- Duplicate detection trends
- Performance metrics
- Historical reports

## 🔧 Operations

### Backup & Restore

```bash
# Backup database
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh backups/db_backup_20231201_120000.sql.gz
```

### Service Management

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Access application container
docker-compose exec app sh

# Database access
docker-compose exec postgres psql -U opera_user -d opera_merger
```

### Monitoring

```bash
# Check system health
curl http://localhost/api/system/health

# View polling status
curl http://localhost/api/polling/status

# Get merge statistics
curl http://localhost/api/merges/statistics
```

## 🧠 AI Algorithm Details

### Similarity Scoring

The AI uses multiple algorithms to calculate similarity:

1. **Name Matching**
   - Jaro-Winkler distance for phonetic similarity
   - Weight: 40% of overall score

2. **Email Matching**
   - Normalization and domain matching
   - Weight: 20% of overall score

3. **Phone Matching**
   - Number standardization and last-7-digit matching
   - Weight: 15% of overall score

4. **Address Matching**
   - Geocoding and string similarity
   - Weight: 15% of overall score

5. **Data Completeness**
   - Profile completeness comparison
   - Weight: 10% of overall score

### Survivor Selection Logic

1. **Master Profile Keywords** - Profiles with protection keywords are never victims
2. **Data Completeness** - More complete profiles preferred as survivors
3. **Creation Date** - Older profiles preferred when completeness is equal
4. **Business Activity** - Profiles with more reservations/activity preferred

## 🔒 Security

### Authentication
- OHIP OAuth 2.0 integration
- JWT-based API authentication
- Rate limiting and request validation

### Data Protection
- Encrypted environment variables
- Secure database connections
- Audit logging for all operations

### Network Security
- Docker network isolation
- Nginx reverse proxy
- CORS configuration

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U opera_user -d opera_merger -c "SELECT 1;"
```

#### OHIP API Issues
```bash
# Check OHIP credentials
curl -H "Authorization: Bearer $TOKEN" "$OHIP_BASE_URL/crm/v1/profiles?limit=1"

# View API logs
docker-compose logs app | grep "OHIP"
```

#### High Memory Usage
```bash
# Monitor resource usage
docker stats

# Adjust container limits
# Edit docker-compose.yml to add resource constraints
```

### Performance Optimization

1. **Database Indexing**
   - Ensure proper indexes on frequently queried fields
   - Monitor slow queries with `EXPLAIN ANALYZE`

2. **API Rate Limiting**
   - Adjust rate limits based on OHIP constraints
   - Implement caching for frequently accessed data

3. **Polling Optimization**
   - Adjust polling intervals based on profile creation volume
   - Use batching for large profile sets

## 📝 Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Setup database
npm run migrate
npm run seed

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/services/aiService.test.js
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@yourcompany.com
- 📖 Documentation: [Wiki](https://github.com/your-org/opera-profile-merger/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/opera-profile-merger/issues)

## 🗺️ Roadmap

### Version 1.1 (Planned)
- [ ] Machine learning model for similarity scoring
- [ ] Advanced conflict resolution rules
- [ ] Multi-property support
- [ ] Enhanced reporting dashboard

### Version 1.2 (Planned)
- [ ] Real-time event streaming (if available from OHIP)
- [ ] Advanced analytics and insights
- [ ] Integration with external CRM systems
- [ ] Mobile-responsive dashboard

---

**Built with ❤️ for the hospitality industry**


## Hostinger-ready cleanup in this package

This package was cleaned for Hostinger Docker Manager:
- fixed invalid Dockerfile usage of `COPY` inside `RUN`
- removed macOS junk files like `__MACOSX` and `.DS_Store`
- added a fallback `frontend/dist/index.html`
- patched the server to work even when no compiled frontend is present
- simplified `docker-compose.yml` to a single deployable app service
- removed bind mounts that commonly break in managed Docker platforms

Use:
- Compose file: `docker-compose.yml`
- Container port: `3000`
