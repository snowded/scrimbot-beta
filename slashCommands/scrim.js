const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const supabase = require('../db/supabase');
const { logAction } = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scrim')
    .setDescription('Scrim management commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('post')
        .setDescription('Post a scrim looking for opponents')
        .addStringOption(option =>
          option
            .setName('format')
            .setDescription('Match format')
            .setRequired(true)
            .addChoices(
              { name: 'Best of 1 (Bo1)', value: 'Bo1' },
              { name: 'Best of 3 (Bo3)', value: 'Bo3' },
              { name: 'Best of 5 (Bo5)', value: 'Bo5' }
            )
        )
        .addStringOption(option =>
          option
            .setName('maps')
            .setDescription('Maps for the match (e.g., Ascent, Haven)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('time')
            .setDescription('Match time (e.g., 8:00 PM EST, Today 6PM)')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('server')
            .setDescription('Server/Region (e.g., NA East, EU, Asia)')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'post') {
      await this.handleScrimPost(interaction);
    }
  },

  async handleScrimPost(interaction) {
    try {
      // Check if user has captain role
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .eq('guild_id', interaction.guild.id);

      const userTeam = teams?.find(team =>
        interaction.member.roles.cache.has(team.captain_role_id)
      );

      if (!userTeam) {
        return interaction.reply({
          content: '❌ Only team captains can post scrims!',
          ephemeral: true
        });
      }

      await interaction.deferReply();

      // Get command options
      const format = interaction.options.getString('format');
      const maps = interaction.options.getString('maps');
      const time = interaction.options.getString('time');
      const server = interaction.options.getString('server');

      // Get team roles and members
      const captainRole = interaction.guild.roles.cache.get(userTeam.captain_role_id);
      const teamRole = interaction.guild.roles.cache.get(userTeam.team_role_id);

      // Fetch team members
      const teamMembers = interaction.guild.members.cache.filter(member =>
        member.roles.cache.has(userTeam.team_role_id)
      );

      // Get ranks of team members
      const ranks = [];
      teamMembers.forEach(member => {
        const rankRoles = member.roles.cache.filter(role =>
          ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'].some(rank =>
            role.name.includes(rank)
          )
        );
        rankRoles.forEach(role => ranks.push(role.name));
      });

      // Create scrim embed
      const scrimEmbed = new EmbedBuilder()
        .setColor('#00D9FF')
        .setTitle('⚔️ Looking for Scrim')
        .setDescription(`**${userTeam.team_name}** is looking for opponents!`)
        .addFields(
          { name: '📋 Format', value: format, inline: true },
          { name: '🗺️ Maps', value: maps, inline: true },
          { name: '🕐 Time', value: time, inline: true },
          { name: '🌐 Server', value: server, inline: true },
          { name: '👥 Team Size', value: `${teamMembers.size} players`, inline: true },
          { name: '📊 Team Record', value: `${userTeam.wins}W - ${userTeam.losses}L`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Posted by ${interaction.user.tag}` });

      // Add ranks if available
      if (ranks.length > 0) {
        const uniqueRanks = [...new Set(ranks)];
        scrimEmbed.addFields({
          name: '🏆 Team Ranks',
          value: uniqueRanks.join(', ') || 'No ranks found',
          inline: false
        });
      }

      // Find looking-for-scrim channel
      const scrimChannel = interaction.guild.channels.cache.find(
        channel => channel.name.toLowerCase().includes('looking-for-scrim') ||
                   channel.name.toLowerCase().includes('scrim')
      );

      if (!scrimChannel) {
        return interaction.editReply({
          content: '❌ Could not find a #looking-for-scrim channel. Please create one first.',
          ephemeral: true
        });
      }

      // Post to scrim channel
      const scrimMessage = await scrimChannel.send({ embeds: [scrimEmbed] });

      // Save to database
      const { data: newScrim, error } = await supabase
        .from('scrims')
        .insert({
          guild_id: interaction.guild.id,
          team_id: userTeam.id,
          format: format,
          maps: maps,
          time: time,
          server: server,
          message_id: scrimMessage.id,
          channel_id: scrimChannel.id,
          posted_by: interaction.user.id,
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving scrim:', error);
        // Still show success to user even if DB save fails
      }

      // Log the action
      await logAction(
        interaction.guild.id,
        'scrim_post',
        interaction.user.id,
        newScrim?.id,
        {
          team_name: userTeam.team_name,
          format,
          maps,
          time,
          server
        }
      );

      // Reply to user
      return interaction.editReply({
        content: `✅ Scrim posted successfully in ${scrimChannel}!`,
        ephemeral: true
      });

    } catch (err) {
      console.error('Error in scrim post command:', err);

      const errorMessage = {
        content: '❌ An error occurred while posting the scrim.',
        ephemeral: true
      };

      if (interaction.deferred) {
        return interaction.editReply(errorMessage);
      } else {
        return interaction.reply(errorMessage);
      }
    }
  }
};
