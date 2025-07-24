const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const axios = require('axios');

// --- Begin: Inlined pipeline.js logic ---
function getUserPaths(userId) {
    const userDir = path.join(__dirname, '../users', userId);
    return {
        USER_FOLDER: userDir,
        QUEUE_FOLDER: path.join(userDir, 'queue'),
        CONTEXT_FOLDER: path.join(userDir, 'context'),
        ORGANIZED_FOLDER: path.join(userDir, 'organized')
    };
}

async function initializeUserDirectories(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required');
    }
    const userPaths = getUserPaths(userId);
    try {
        await fs.mkdir(userPaths.USER_FOLDER, { recursive: true });
        await fs.mkdir(userPaths.QUEUE_FOLDER, { recursive: true });
        await fs.mkdir(userPaths.CONTEXT_FOLDER, { recursive: true });
        await fs.mkdir(userPaths.ORGANIZED_FOLDER, { recursive: true });
        console.log(`User directories initialized for: ${userId}`);
        return true;
    } catch (error) {
        console.error(`Failed to initialize directories for user ${userId}:`, error);
        throw error;
    }
}

async function runPipeline(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required');
    }
    const userPaths = getUserPaths(userId);
    try {
        const queueFiles = await fs.readdir(userPaths.QUEUE_FOLDER);
        if (queueFiles.length === 0) {
            console.log(`No files to process for user: ${userId}`);
            return;
        }
        // Read all context files for the user
        let contextText = '';
        try {
            const contextFiles = await fs.readdir(userPaths.CONTEXT_FOLDER);
            for (const ctxFile of contextFiles) {
                const ctxPath = path.join(userPaths.CONTEXT_FOLDER, ctxFile);
                contextText += await fs.readFile(ctxPath, 'utf-8') + '\n';
            }
        } catch (ctxErr) {
            console.warn('No context files or error reading context for user:', userId, ctxErr);
        }
        console.log(`Processing ${queueFiles.length} files for user: ${userId}`);
        for (const fileName of queueFiles) {
            const sourceFile = path.join(userPaths.QUEUE_FOLDER, fileName);
            const targetFile = path.join(userPaths.ORGANIZED_FOLDER, fileName);
            try {
                // Read file content
                const fileContent = await fs.readFile(sourceFile, 'utf-8');
                let outputJson = null;
                if (process.env.AI_PROVIDER === 'HUGGINGFACE') {
                    // Hugging Face Inference API
                    const response = await axios.post(
                        `https://api-inference.huggingface.co/models/${process.env.HF_MODEL}`,
                        { inputs: contextText + '\n' + fileContent },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.HF_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    outputJson = response.data;
                } else {
                    // Default: OpenAI
                    const response = await axios.post(
                        process.env.AI_COMPLETION_URL,
                        {
                            model: process.env.AI_MODEL,
                            messages: [
                                { role: 'system', content: process.env.AI_PROMPT + '\n' + contextText },
                                { role: 'user', content: fileContent }
                            ]
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    const output = response.data.choices[0].message.content;
                    outputJson = JSON.parse(output);
                }
                const outputFile = path.join(userPaths.ORGANIZED_FOLDER, fileName + '.json');
                await fs.writeFile(outputFile, JSON.stringify(outputJson, null, 2), 'utf-8');
                // Move original file to organized
                await fs.rename(sourceFile, targetFile);
                console.log(`Processed file: ${fileName} for user: ${userId}`);
            } catch (fileError) {
                console.error(`Error processing file ${fileName} for user ${userId}:`, fileError);
            }
        }
        console.log(`Pipeline completed for user: ${userId}`);
    } catch (error) {
        console.error(`Error running pipeline for user ${userId}:`, error);
        throw error;
    }
}
// --- End: Inlined pipeline.js logic ---

class MultiUserPipelineManager {
    constructor() {
        this.usersDirectory = path.join(__dirname, '../users');
        this.isRunning = false;
        this.processingInterval = 5000; // Check every 5 seconds
        this.userLastProcessed = new Map(); // Track last processing time per user
    }

    /**
     * Initialize the multi-user system
     */
    async initialize() {
        try {
            // Ensure users directory exists
            await fs.mkdir(this.usersDirectory, { recursive: true });
            console.log('Multi-user pipeline manager initialized');
        } catch (error) {
            console.error('Failed to initialize multi-user pipeline manager:', error);
            throw error;
        }
    }

    /**
     * Get list of all user directories
     */
    async getAllUsers() {
        try {
            const entries = await fs.readdir(this.usersDirectory, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch (error) {
            console.error('Error reading users directory:', error);
            return [];
        }
    }

    /**
     * Check if a user has files in their queue
     */
    async hasFilesInQueue(userId) {
        try {
            const userPaths = getUserPaths(userId);
            const queueFiles = await fs.readdir(userPaths.QUEUE_FOLDER);
            return queueFiles.length > 0;
        } catch (error) {
            // Queue folder might not exist yet
            return false;
        }
    }

    /**
     * Process files for a specific user
     */
    async processUserFiles(userId) {
        try {
            console.log(`Processing files for user: ${userId}`);
            
            // Initialize user directories if they don't exist
            await initializeUserDirectories(userId);
            
            // Check if user has files to process
            const hasFiles = await this.hasFilesInQueue(userId);
            if (!hasFiles) {
                return;
            }

            // Run the pipeline for this user
            await runPipeline(userId);
            
            // Update last processed time
            this.userLastProcessed.set(userId, Date.now());
            
            console.log(`Successfully processed files for user: ${userId}`);
        } catch (error) {
            console.error(`Error processing files for user ${userId}:`, error);
        }
    }

    /**
     * Process files for all users
     */
    async processAllUsers() {
        const users = await this.getAllUsers();
        
        if (users.length === 0) {
            console.log('No users found. Waiting for users to be created...');
            return;
        }

        console.log(`Found ${users.length} users: ${users.join(', ')}`);

        // Process each user's files
        for (const userId of users) {
            await this.processUserFiles(userId);
        }
    }

    /**
     * Start monitoring all users' directories
     */
    async startMonitoring() {
        if (this.isRunning) {
            console.log('Pipeline manager is already running');
            return;
        }

        console.log('Starting multi-user pipeline monitoring...');
        this.isRunning = true;

        // Initial processing (disabled for manual-only mode)
        // await this.processAllUsers();

        // Set up interval for continuous monitoring (disabled)
        // this.monitoringInterval = setInterval(async () => {
        //     if (this.isRunning) {
        //         await this.processAllUsers();
        //     }
        // }, this.processingInterval);

        console.log('Multi-user pipeline monitoring started (manual mode, no automatic processing)');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isRunning) {
            console.log('Pipeline manager is not running');
            return;
        }

        console.log('Stopping multi-user pipeline monitoring...');
        this.isRunning = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        console.log('Multi-user pipeline monitoring stopped');
    }

    /**
     * Create a new user directory structure
     */
    async createUser(userId) {
        if (!userId || typeof userId !== 'string') {
            throw new Error('Valid user ID is required');
        }

        try {
            console.log(`Creating user directory structure for: ${userId}`);
            await initializeUserDirectories(userId);
            console.log(`User ${userId} created successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to create user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        try {
            const userPaths = getUserPaths(userId);
            const stats = {
                userId,
                queueFiles: 0,
                organizedFiles: 0,
                lastProcessed: this.userLastProcessed.get(userId) || null
            };

            try {
                const queueFiles = await fs.readdir(userPaths.QUEUE_FOLDER);
                stats.queueFiles = queueFiles.length;
            } catch (error) {
                // Queue folder might not exist
            }

            try {
                const organizedFiles = await fs.readdir(userPaths.ORGANIZED_FOLDER);
                stats.organizedFiles = organizedFiles.length;
            } catch (error) {
                // Organized folder might not exist
            }

            return stats;
        } catch (error) {
            console.error(`Error getting stats for user ${userId}:`, error);
            return null;
        }
    }

    /**
     * Get statistics for all users
     */
    async getAllUserStats() {
        const users = await this.getAllUsers();
        const stats = [];

        for (const userId of users) {
            const userStats = await this.getUserStats(userId);
            if (userStats) {
                stats.push(userStats);
            }
        }

        return stats;
    }
}

// Export the class
module.exports = MultiUserPipelineManager;

// Run if this file is executed directly
if (require.main === module) {
    (async () => {
        const manager = new MultiUserPipelineManager();
        
        try {
            await manager.initialize();
            
            // Create a test user for demonstration
            await manager.createUser('demo-user');
            
            // Start monitoring
            await manager.startMonitoring();
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\nReceived SIGINT, shutting down gracefully...');
                manager.stopMonitoring();
                process.exit(0);
            });
            
        } catch (error) {
            console.error('Failed to start multi-user pipeline manager:', error);
            process.exit(1);
        }
    })();
}
