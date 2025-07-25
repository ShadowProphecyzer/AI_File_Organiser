const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { parse: csvParse } = require('csv-parse/sync');

// --- User directory helpers ---
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

// Helper: chunk text to fit OpenAI context window (approx 4000 tokens = ~16k chars)
function chunkText(text, maxLen = 16000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLen) {
        chunks.push(text.slice(i, i + maxLen));
    }
    return chunks;
}

async function extractTextFromFile(filePath, ext) {
    // Only allow text-based files: PDF, DOCX, TXT, CSV, JSON, YAML, XML, LOG, MD, INI
    if (["txt","md","log","ini","yaml","yml","json","xml"].includes(ext)) {
        return await fs.readFile(filePath, 'utf-8');
    } else if (ext === "csv") {
        const raw = await fs.readFile(filePath, 'utf-8');
        const records = csvParse(raw, { columns: false, skip_empty_lines: true });
        return records.map(row => row.join(", ")).join("\n");
    } else if (ext === "pdf") {
        const data = await fs.readFile(filePath);
        const parsed = await pdfParse(data);
        return parsed.text;
    } else if (ext === "docx") {
        const data = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer: data });
        return result.value;
    } else {
        // Skip all other types (images, audio, etc.)
        return null;
    }
}

// --- Main pipeline logic: OpenAI text-only ---
async function runPipeline(userId) {
    if (!userId || typeof userId !== 'string') {
        throw new Error('Valid user ID is required');
    }
    const userPaths = getUserPaths(userId);
    // Read the prompt from prompt.txt in the same directory as this file
    let prompt;
    try {
        const promptPath = path.join(__dirname, 'prompt.txt');
        prompt = await fs.readFile(promptPath, 'utf-8');
        if (!prompt.trim()) {
            throw new Error('Prompt in prompt.txt is empty');
        }
    } catch (err) {
        console.error(`[PIPELINE] Failed to read prompt.txt:`, err);
        throw err;
    }
    try {
        const queueFiles = await fs.readdir(userPaths.QUEUE_FOLDER);
        // Update current_system_file_name in current_file_name.json before processing
        const currentFileNamePath = path.join(userPaths.CONTEXT_FOLDER, 'current_file_name.json');
        let currentFileNameData = {};
        try {
            const currentFileNameRaw = await fs.readFile(currentFileNamePath, 'utf-8');
            currentFileNameData = JSON.parse(currentFileNameRaw);
        } catch (e) {
            // If file doesn't exist or is invalid, start fresh
            currentFileNameData = {};
        }
        if (queueFiles.length === 0) {
            currentFileNameData.current_system_file_name = "";
            await fs.writeFile(currentFileNamePath, JSON.stringify(currentFileNameData, null, 2));
            console.log(`[PIPELINE] No files to process for user: ${userId}`);
            return;
        }
        // Read and chunk all context files for the user, include as system messages
        let contextMessages = [];
        try {
            const contextFiles = await fs.readdir(userPaths.CONTEXT_FOLDER);
            for (const ctxFile of contextFiles) {
                const ctxPath = path.join(userPaths.CONTEXT_FOLDER, ctxFile);
                let ctxContent = await fs.readFile(ctxPath, 'utf-8');
                // Chunk context file if large
                const ctxChunks = chunkText(ctxContent);
                for (let i = 0; i < ctxChunks.length; i++) {
                    contextMessages.push({
                        role: 'system',
                        content: `[CONTEXT FILE: ${ctxFile}${ctxChunks.length > 1 ? ` (chunk ${i+1}/${ctxChunks.length})` : ''}]:\n` + ctxChunks[i]
                    });
                }
            }
        } catch (ctxErr) {
            console.warn(`[PIPELINE] No context files or error reading context for user: ${userId}`, ctxErr);
        }
        // Add the prompt as the first system message
        contextMessages.unshift({ role: 'system', content: prompt });
        console.log(`[PIPELINE] Processing ${queueFiles.length} files for user: ${userId}`);
        for (const fileName of queueFiles) {
            // Update current_system_file_name before processing this file
            currentFileNameData.current_system_file_name = fileName;
            await fs.writeFile(currentFileNamePath, JSON.stringify(currentFileNameData, null, 2));
            // Wait 2 seconds before sending to AI
            await new Promise(resolve => setTimeout(resolve, 2000));
            const sourceFile = path.join(userPaths.QUEUE_FOLDER, fileName);
            const targetFile = path.join(userPaths.ORGANIZED_FOLDER, fileName);
            try {
                const ext = fileName.split('.').pop().toLowerCase();
                const text = await extractTextFromFile(sourceFile, ext);
                if (!text) {
                    console.warn(`[PIPELINE] Skipping unsupported file type for OpenAI: ${fileName}`);
                    continue;
                }
                const chunks = chunkText(text);
                let allOutputs = [];
                for (const chunk of chunks) {
                    // Compose messages: prompt, all context chunks, then user chunk
                    const messages = [
                        ...contextMessages,
                        { role: 'user', content: chunk }
                    ];
                    const response = await axios.post(
                        process.env.AI_COMPLETION_URL,
                        {
                            model: process.env.AI_MODEL,
                            messages
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.AI_API_KEY}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    allOutputs.push(response.data.choices[0].message.content);
                }
                // --- PRETTY JSON OUTPUT HANDLING ---
                // If only one output, try to extract and pretty-print the JSON
                let outputToWrite;
                if (allOutputs.length === 1) {
                    let raw = allOutputs[0];
                    try {
                        // Remove markdown code block if present
                        raw = raw.replace(/^```json[\r\n]+|```$/gim, '').trim();
                        // Remove generic code block if present
                        raw = raw.replace(/^```[\w]*[\r\n]+|```$/gim, '').trim();
                        // Parse JSON
                        const parsed = JSON.parse(raw);
                        outputToWrite = JSON.stringify(parsed, null, 2);
                    } catch (err) {
                        console.error(`[PIPELINE] Failed to parse AI output as JSON. Saving raw output.`, err);
                        outputToWrite = raw;
                    }
                } else {
                    // Multi-chunk: save as array of pretty-printed JSON objects if possible
                    let parsedChunks = [];
                    for (let raw of allOutputs) {
                        try {
                            raw = raw.replace(/^```json[\r\n]+|```$/gim, '').trim();
                            raw = raw.replace(/^```[\w]*[\r\n]+|```$/gim, '').trim();
                            parsedChunks.push(JSON.parse(raw));
                        } catch (err) {
                            parsedChunks.push(raw);
                        }
                    }
                    try {
                        outputToWrite = JSON.stringify(parsedChunks, null, 2);
                    } catch (err) {
                        outputToWrite = JSON.stringify(allOutputs, null, 2);
                    }
                }
                const outputFile = path.join(userPaths.ORGANIZED_FOLDER, fileName + '.json');
                await fs.writeFile(outputFile, outputToWrite, 'utf-8');
                await fs.rename(sourceFile, targetFile);
                console.log(`[PIPELINE] Processed file: ${fileName} for user: ${userId}`);
            } catch (fileError) {
                console.error(`[PIPELINE] Error processing file ${fileName} for user ${userId}:`, fileError);
            }
        }
        console.log(`[PIPELINE] Pipeline completed for user: ${userId}`);
    } catch (error) {
        console.error(`[PIPELINE] Error running pipeline for user ${userId}:`, error);
        throw error;
    }
}

// --- Multi-user manager ---
class MultiUserPipelineManager {
    constructor() {
        this.usersDirectory = path.join(__dirname, '../users');
        this.isRunning = false;
        this.userLastProcessed = new Map(); // Track last processing time per user
    }

    /**
     * Initialize the multi-user system
     */
    async initialize() {
        try {
            await fs.mkdir(this.usersDirectory, { recursive: true });
            console.log('[INIT] Multi-user pipeline manager initialized');
        } catch (error) {
            console.error('[INIT] Failed to initialize multi-user pipeline manager:', error);
            throw error;
        }
    }

    /**
     * Get list of all user directories
     */
    async getAllUsers() {
        try {
            const entries = await fs.readdir(this.usersDirectory, { withFileTypes: true });
            const users = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
            console.log(`[SCAN] Found users: ${users.join(', ')}`);
            return users;
        } catch (error) {
            console.error('[SCAN] Error reading users directory:', error);
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
            console.log(`[QUEUE] User ${userId} has ${queueFiles.length} files in queue`);
            return queueFiles.length > 0;
        } catch (error) {
            return false;
        }
    }

    /**
     * Process files for a specific user
     */
    async processUserFiles(userId) {
        try {
            console.log(`[PROCESS] Starting processing for user: ${userId}`);
            await initializeUserDirectories(userId);
            const hasFiles = await this.hasFilesInQueue(userId);
            if (!hasFiles) {
                console.log(`[PROCESS] No files to process for user: ${userId}`);
                return;
            }
            await runPipeline(userId);
            this.userLastProcessed.set(userId, Date.now());
            console.log(`[PROCESS] Finished processing for user: ${userId}`);
        } catch (error) {
            console.error(`[PROCESS] Error processing files for user ${userId}:`, error);
        }
    }

    /**
     * Process files for all users
     */
    async processAllUsers() {
        console.log('[MONITOR] Scanning all users for queued files...');
        const users = await this.getAllUsers();
        if (users.length === 0) {
            console.log('[MONITOR] No users found. Waiting for users to be created...');
            return;
        }
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

        // Initial processing
        await this.processAllUsers();

        // Set up interval for continuous monitoring (every 10 seconds)
        this.monitoringInterval = setInterval(async () => {
            if (this.isRunning) {
                console.log('[MONITOR] Running automatic processing for all users...');
                await this.processAllUsers();
            }
        }, 10000);

        console.log('Multi-user pipeline monitoring started (automatic processing every 10 seconds)');
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
            // Create <username>_context.json in the context folder with prefilled text
            const userPaths = getUserPaths(userId);
            const contextFilePath = path.join(userPaths.CONTEXT_FOLDER, `${userId}_context.json`);
            const contextContent = {
                "instructions": [
                    "For carrying out file organisation you as an AI can carry out 4 instructions in bash for every file:",
                    "1. Make a directory: mkdir",
                    "2. Enter directory: cd",
                    "3. Delete file/directory: rm",
                    "4. Move file: mv",
                    "Keep in mind the below information when generating the output."
                ]
            };
            await fs.writeFile(contextFilePath, JSON.stringify(contextContent, null, 2), 'utf-8');
            // Create current_file_name.json in the context folder with empty current_system_file_name
            const newContextFilePath = path.join(userPaths.CONTEXT_FOLDER, 'current_file_name.json');
            const newContextContent = { "current_system_file_name": "" };
            await fs.writeFile(newContextFilePath, JSON.stringify(newContextContent, null, 2), 'utf-8');
            console.log(`Context file created for user: ${userId}`);
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
