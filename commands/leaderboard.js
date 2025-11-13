const { EmbedBuilder } = require('discord.js');
const supabase = require('../db/supabase');

module.exports.run = async (client, message, args) => {
  try {
    // Check if user wants to sort by total wins
    const sortByWins = args[0] && args[0].toLowerCase() === 'wins';

    // Fetch teams from database
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('guild_id', message.guild.id);

    if (error) {
      console.error('Error fetching teams:', error);
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription('❌ Failed to fetch leaderboard data.')
        ]
      });
    }

    if (!teams || teams.length === 0) {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFA500')
            .setDescription('📊 No teams found yet. Create a team using `,teamcreate`!')
        ]
      });
    }

    // Calculate win rates and sort
    const teamsWithStats = teams.map(team => {
      const totalGames = team.wins + team.losses;
      const winRate = totalGames > 0 ? ((team.wins / totalGames) * 100).toFixed(1) : 0;
      return {
        ...team,
        winRate: parseFloat(winRate),
        totalGames
      };
    });

    // Sort teams
    if (sortByWins) {
      teamsWithStats.sort((a, b) => b.wins - a.wins);
    } else {
      // Sort by win rate (default)
      teamsWithStats.sort((a, b) => {
        // Teams with same win rate, sort by total games
        if (b.winRate === a.winRate) {
          return b.totalGames - a.totalGames;
        }
        return b.winRate - a.winRate;
      });
    }

    // Take top 10
    const top10 = teamsWithStats.slice(0, 10);

    // Build leaderboard embed
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`🏆 Team Leaderboard ${sortByWins ? '(Total Wins)' : '(Win Rate)'}`)
      .setDescription(`Showing top ${top10.length} team${top10.length !== 1 ? 's' : ''}`)
      .setTimestamp();

    // Add fields for each team
    top10.forEach((team, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const captainRole = message.guild.roles.cache.get(team.captain_role_id);
      const teamRole = message.guild.roles.cache.get(team.team_role_id);

      embed.addFields({
        name: `${medal} ${team.team_name}`,
        value: [
          `**Win Rate:** ${team.winRate}% (${team.wins}W - ${team.losses}L)`,
          `**Captain:** ${captainRole ? captainRole.toString() : 'Unknown'}`,
          `**Team Role:** ${teamRole ? teamRole.toString() : 'Unknown'}`
        ].join('\n'),
        inline: false
      });
    });

    // Add footer with toggle info
    embed.setFooter({
      text: sortByWins
        ? 'Use ,leaderboard to sort by win rate'
        : 'Use ,leaderboard wins to sort by total wins'
    });

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('Error in leaderboard command:', err);
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF0000')
          .setDescription('❌ An error occurred while fetching the leaderboard.')
      ]
    });
  }
};

module.exports.conf = {
  aliases: ['lb', 'top']
};

module.exports.help = {
  name: 'leaderboard'
};
