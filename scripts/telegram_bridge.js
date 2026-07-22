/**
 * ColAsi Telegram AI Agent Laptop Bridge
 * Allows controlling your laptop's AI Agent & codebase remotely from your phone over Telegram!
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const CONFIG_FILE = path.join(__dirname, 'telegram_config.json');

let botToken = '';
let allowedChatId = null;
let lastUpdateId = 0;

function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            botToken = data.botToken || '';
            allowedChatId = data.allowedChatId || null;
        } catch (e) {}
    }
}

function saveConfig() {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ botToken, allowedChatId }, null, 2));
}

// Telegram API Helper (Uses native Node fetch out of the box!)
async function apiCall(method, body = {}) {
    if (!botToken) return null;
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return await res.json();
    } catch (err) {
        console.error(`Telegram API Error (${method}):`, err.message);
        return null;
    }
}

async function sendMessage(chatId, text) {
    const maxLength = 4000;
    for (let i = 0; i < text.length; i += maxLength) {
        const chunk = text.slice(i, i + maxLength);
        await apiCall('sendMessage', {
            chat_id: chatId,
            text: chunk,
            parse_mode: 'Markdown',
        }).catch(async () => {
            await apiCall('sendMessage', { chat_id: chatId, text: chunk });
        });
    }
}

async function handleCommand(chatId, promptText) {
    console.log(`\n📱 [Telegram Command Received]: ${promptText}`);
    await sendMessage(chatId, `⏳ *Processing task on laptop...*\n\`${promptText}\``);

    const projectDir = path.resolve(__dirname, '..');
    const safePrompt = promptText.replace(/"/g, '\\"');

    // Run agent prompt or git/eas commands
    const commandToRun = `cd /d "${projectDir}" && agy --prompt "${safePrompt}"`;

    exec(commandToRun, { maxBuffer: 1024 * 1024 * 10 }, async (error, stdout, stderr) => {
        let output = stdout || stderr || (error ? error.message : 'Task finished successfully.');
        
        if (output.length > 3000) {
            output = output.slice(-3000);
        }

        console.log(`✅ [Task Finished]`);
        await sendMessage(chatId, `✅ *Task Executed!*\n\n\`\`\`\n${output}\n\`\`\``);
    });
}

async function pollUpdates() {
    if (!botToken || botToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
        return;
    }

    const res = await apiCall('getUpdates', { offset: lastUpdateId + 1, timeout: 15 });
    if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
            lastUpdateId = update.update_id;
            const msg = update.message;
            if (!msg || !msg.text) continue;

            const chatId = msg.chat.id;
            const text = msg.text.trim();

            // Lock security to the first user who messages the bot
            if (!allowedChatId) {
                allowedChatId = chatId;
                saveConfig();
                await sendMessage(chatId, `🔒 *Security Lock Activated!*\n\nYour Telegram account (Chat ID: \`${chatId}\`) is now paired with your laptop bridge.\n\nSend any command to control your laptop agent!`);
                continue;
            }

            if (chatId !== allowedChatId) {
                await sendMessage(chatId, '❌ Unauthorized user.');
                continue;
            }

            if (text === '/start' || text === '/help') {
                await sendMessage(chatId, `👋 *ColAsi Laptop AI Bridge Active!*\n\nSend any task (e.g. _"Change gold theme color"_, _"Check syntax"_, _"Publish EAS update"_).`);
                continue;
            }

            await handleCommand(chatId, text);
        }
    }
}

async function main() {
    loadConfig();
    console.log('====================================================');
    console.log('🤖 ColAsi Telegram Laptop Bridge Running...');
    console.log('====================================================');

    if (!botToken || botToken === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
        console.log('\n⚠️ BOT TOKEN REQUIRED!');
        console.log('1. Open Telegram on your phone and search for @BotFather');
        console.log('2. Send /newbot to get your HTTP API Token');
        console.log('3. Paste the token into scripts/telegram_config.json\n');
    } else {
        console.log('⚡ Listening for commands from your phone...\n');
    }

    while (true) {
        await pollUpdates();
        await new Promise(r => setTimeout(r, 1000));
    }
}

main();
