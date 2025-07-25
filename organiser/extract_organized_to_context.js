const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// Detect platform and set shell
const isWin = os.platform() === 'win32';
const bashShell = isWin ? 'bash' : '/bin/bash';

async function extractToContext(userId) {
  const userDir = path.join(__dirname, '../users', userId);
  const organizedDir = path.join(userDir, 'organized');
  const contextDir = path.join(userDir, 'context');
  const contextFile = path.join(contextDir, `${userId}_context.json`);

  // Read or initialize context
  let context = {};
  try {
    const raw = await fs.readFile(contextFile, 'utf-8');
    context = JSON.parse(raw);
  } catch (e) {
    context.instructions = [];
  }
  // Always set the user field
  context.user = userId;
  // Ensure instructions array is present and updated
  const baseInstructions = [
    "For file organisation, you as an AI can use ONLY the following bash commands:",
    "1. Make a directory: mkdir <directory>",
    "2. Enter directory: cd <directory>",
    "3. Delete file/directory: rm <file_or_directory>",
    "4. Move file: mv <source> <destination>",
    `5. Every command must start with: cd users/${userId}/organized (all file operations must be performed from inside this directory)`,
    "6. Try to suggest file paths in similar locations as previous files if possible. ",
    "Always output only the bash commands needed, nothing else."
  ];
  context.instructions = baseInstructions;

  // Get all .json files in organized
  let files;
  const processedFiles = new Set();
  try {
    files = await fs.readdir(organizedDir);
  } catch (e) {
    console.error(`No organized directory for user ${userId}`);
    return;
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    if (processedFiles.has(file)) continue;
    processedFiles.add(file);
    const filePath = path.join(organizedDir, file);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(raw);
      // Use base name (remove .pdf.json or .json)
      const base = file.replace(/\.pdf\.json$/i, '').replace(/\.json$/i, '');
      context[base] = {
        file_name: data.file_name,
        description: data.description,
        tags: data.tags,
        suggested_file_path: data.suggested_file_path
      };
      // Run bash_command if present
      if (typeof data.bash_command === 'string' && data.bash_command.trim()) {
        console.log(`[${userId}] Running bash command for ${file} in shell (${bashShell}): ${data.bash_command}`);
        await new Promise((resolve) => {
          exec(data.bash_command, { cwd: path.join(__dirname, '..'), shell: bashShell }, (error, stdout, stderr) => {
            if (error) {
              console.error(`[${userId}] Error running bash command for ${file}:`, error.message);
            }
            if (stdout) console.log(`[${userId}] Bash output for ${file}:`, stdout.trim());
            if (stderr) console.error(`[${userId}] Bash error output for ${file}:`, stderr.trim());
            resolve();
          });
        });
      }
      // Delete the processed .json file
      // try {
      //   await fs.unlink(filePath);
      //   console.log(`[${userId}] Deleted processed file: ${file}`);
      // } catch (delErr) {
      //   console.error(`[${userId}] Failed to delete processed file: ${file}`, delErr.message);
      // }
    } catch (e) {
      console.error(`Failed to process ${file}:`, e.message);
    }
  }
  // Save context back to file
  try {
    await fs.writeFile(contextFile, JSON.stringify(context, null, 2));
    console.log(`[${userId}] Context saved to ${contextFile}`);
  } catch (e) {
    console.error(`[${userId}] Failed to save context to ${contextFile}:`, e.message);
  }
}

module.exports = {
  extractToContext
};