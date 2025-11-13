const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../db/supabase');
const { logAction } = require('../utils/logger');

module.exports.run = async (client, message, args) => {
  // Check if user has administrator permission
  if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ You need Administrator permission to create teams.')
      ]
    });
  }

  // Parse command: ,teamcreate <team-name> <captain-role> <team-role>
  if (args.length < 3) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ Usage: `,teamcreate <team-name> <@captain-role> <@team-role>`')
      ]
    });
  }

  const teamName = args[0];

  // Parse roles from mentions
  const captainRole = message.mentions.roles.first();
  const teamRole = message.mentions.roles.at(1);

  if (!captainRole || !teamRole) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ Please mention both captain role and team role.')
      ]
    });
  }

  try {
    // Check if team already exists
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('*')
      .eq('guild_id', message.guild.id)
      .eq('team_name', teamName)
      .maybeSingle();

    if (existingTeam) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`❌ Team **${teamName}** already exists!`)
        ]
      });
    }

    // Create team in database
    const { data: newTeam, error } = await supabase
      .from('teams')
      .insert({
        guild_id: message.guild.id,
        team_name: teamName,
        captain_role_id: captainRole.id,
        team_role_id: teamRole.id,
        created_by: message.author.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('❌ Failed to create team. Please try again.')
        ]
      });
    }

    // Log the action
    await logAction(
      message.guild.id,
      'team_create',
      message.author.id,
      newTeam.id,
      {
        team_name: teamName,
        captain_role: captainRole.name,
        team_role: teamRole.name
      }
    );

    // Send success message
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('✅ Team Created Successfully')
      .addFields(
        { name: 'Team Name', value: teamName, inline: true },
        { name: 'Captain Role', value: captainRole.toString(), inline: true },
        { name: 'Team Role', value: teamRole.toString(), inline: true },
        { name: 'Wins', value: '0', inline: true },
        { name: 'Losses', value: '0', inline: true },
        { name: 'Win Rate', value: '0%', inline: true }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('Error in teamcreate command:', err);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ An error occurred while creating the team.')
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['createteam', 'tc']
};

module.exports.help = {
  name: 'teamcreate'
};
