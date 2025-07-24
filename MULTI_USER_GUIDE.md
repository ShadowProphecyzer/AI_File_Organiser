# Multi-User AI File Organizer Guide

## Overview

The AI File Organizer now supports multiple users, where each user has their own separate directories for file processing. The system automatically monitors all user directories and processes files independently.

## Directory Structure

```
users/
├── user1/
│   ├── queue/          # Files to be processed
│   ├── context/        # AI context files
│   └── organized/      # Processed files
├── user2/
│   ├── queue/
│   ├── context/
│   └── organized/
└── ...
```

## How It Works

1. **User Registration**: When a user signs up, their directory structure is automatically created
2. **File Upload**: Users upload files to their personal `queue` folder
3. **Automatic Processing**: The multi-user pipeline manager monitors all user directories every 5 seconds
4. **Independent Processing**: Each user's files are processed separately with their own context
5. **Organized Output**: Processed files are moved to the user's `organized` folder

## Key Features

### Multi-User Pipeline Manager
- **Automatic Discovery**: Finds all users by scanning the `users/` directory
- **Independent Processing**: Each user's files are processed with their own context
- **Continuous Monitoring**: Checks for new files every 5 seconds
- **Error Isolation**: Errors in one user's processing don't affect others

### API Endpoints

#### User Endpoints (Require Login)
- `GET /api/user/stats` - Get current user's pipeline statistics
- `POST /api/user/process` - Manually trigger pipeline for current user
- `POST /upload` - Upload files to user's queue folder

#### Admin Endpoints
- `GET /api/admin/stats` - Get statistics for all users

### Statistics Tracked
- Number of files in queue
- Number of organized files
- Last processing time
- User ID and status

## Running the System

### Option 1: Integrated Server (Recommended)
```bash
npm start
# or
node server/server.js
```
This starts both the web server and the multi-user pipeline manager.

### Option 2: Standalone Pipeline Manager
```bash
npm run pipeline
# or
node organiser/multi-user-pipeline.js
```
This runs only the pipeline manager without the web interface.

## Configuration

The system uses the same `.env` configuration:
```env
AI_API_KEY=your_openai_api_key
AI_PROMPT=your_custom_prompt
AI_COMPLETION_URL=https://api.openai.com/v1/chat/completions
```

## User Management

### Creating Users
Users are created automatically when they sign up through the web interface. The system:
1. Creates the user in MongoDB
2. Creates their directory structure
3. Initializes their context files

### Manual User Creation
You can also create users programmatically:
```javascript
const MultiUserPipelineManager = require('./organiser/multi-user-pipeline');
const manager = new MultiUserPipelineManager();
await manager.createUser('username');
```

## Monitoring and Debugging

### Console Output
The system provides detailed logging:
- User discovery and processing status
- File processing results
- Error messages with user context
- Pipeline statistics

### File Processing Flow
1. System scans `users/` directory for all users
2. For each user, checks if they have files in their `queue/` folder
3. If files exist, runs the AI pipeline for that user
4. Files are processed with the user's personal context
5. Results are saved to the user's `organized/` folder
6. Process repeats every 5 seconds

## Troubleshooting

### Common Issues

1. **User directories not created**
   - Check if the user signed up properly
   - Verify MongoDB connection
   - Check file system permissions

2. **Files not being processed**
   - Ensure files are in the correct `queue/` folder
   - Check AI API configuration in `.env`
   - Review console logs for errors

3. **Pipeline not starting**
   - Verify the multi-user pipeline manager is initialized
   - Check for JavaScript errors in console
   - Ensure all dependencies are installed

### Debug Mode
To see detailed processing information, check the console output when running the server or pipeline manager.

## Security Considerations

- Each user can only access their own files
- File uploads are restricted to authenticated users
- User directories are isolated from each other
- Admin endpoints should be protected in production

## Performance

- The system processes one file at a time per user
- Multiple users can be processed simultaneously
- Processing interval is configurable (default: 5 seconds)
- File processing is asynchronous and non-blocking
