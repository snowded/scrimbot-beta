const { EmbedBuilder, Embed } = require("discord.js");
const client = require("..");













const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '../keywords.json');

// Load the keywords data from the JSON file
const loadKeywords = () => {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const keywordData = loadKeywords();

    keywordData.keywords.forEach(item => {
        if (message.content.toLowerCase().includes(item.keyword.toLowerCase())) {
            message.channel.send(item.reply);
        }
    });
});


/*
al syllabus
mf19
transtestnh3
transtestnaoh
bond angles
estimation1
estimation2
physics formulae
projectile motion equations
graphing calculator
studyhaven
organic mindmap
prerequisitesfm
*/
