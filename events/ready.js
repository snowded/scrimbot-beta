const client = require("../index");
const { Collection } = require("discord.js");
const fs = require("fs");

client.on("ready", () => {
    console.log(`${client.user.tag} Bot Online!`);
    client.user.setActivity(`With your Grades!`);

    client.commands = new Collection();
    client.aliases = new Collection();
    client.slashCommands = new Collection();

    // Load prefix commands
    fs.readdir("./commands/", (err, files) => {
        if (err) console.error(err);


        files.forEach(f => {
            try {
                let props = require(`../commands/${f}`);

                // Check if command is correctly structured
                if (!props.help || !props.help.name) {
                    console.error(`❌ Error: Command file ${f} is missing the "help" property or "name" in it.`);
                    return;
                }

                console.log(`🎀 ${props.help.name}.js Loaded! `);


                client.commands.set(props.help.name, props);
                props.conf.aliases.forEach(alias => {
                    client.aliases.set(alias, props.help.name);
                });
            } catch (error) {
                console.error(`❌ Failed to load command ${f}:`, error);
            }
        });
    });

    // Load slash commands
    if (fs.existsSync('./slashCommands')) {
        fs.readdir('./slashCommands/', (err, files) => {
            if (err) {
                console.error('Error reading slash commands:', err);
                return;
            }

            files.filter(file => file.endsWith('.js')).forEach(file => {
                try {
                    const command = require(`../slashCommands/${file}`);
                    if (command.data && command.execute) {
                        client.slashCommands.set(command.data.name, command);
                        console.log(`✅ Loaded slash command: ${command.data.name}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to load slash command ${file}:`, error);
                }
            });
        });
    }
});
