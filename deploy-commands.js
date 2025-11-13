require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const config = require('./config.js');

const commands = [];
const slashCommandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'));

for (const file of slashCommandFiles) {
  const command = require(`./slashCommands/${file}`);
  if (command.data) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded slash command: ${command.data.name}`);
  }
}

const token = config.token || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token) {
  console.error('❌ Bot token is missing! Please set TOKEN in config.js or environment variables.');
  process.exit(1);
}

if (!clientId) {
  console.error('❌ CLIENT_ID is missing! Please set CLIENT_ID in environment variables.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
