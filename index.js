import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes } from 'discord.js';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Load config
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const Rscripts = 'https://rscripts.net/api/v2';
const ScriptBlox = 'https://scriptblox.com/api/script/search';

// Register slash commands
const commands = [
  new SlashCommandBuilder()
    .setName('script')
    .setDescription('Search for Roblox scripts')
    .addSubcommand(subcommand =>
      subcommand
        .setName('rscripts')
        .setDescription('Search rscripts.net for scripts')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search query for scripts')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('scriptblox')
        .setDescription('Search scriptblox.com for scripts')
        .addStringOption(option =>
          option.setName('query')
            .setDescription('Search query for scripts')
            .setRequired(true))
    )
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(config.token);

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Set bot status and activity
  client.user.setStatus(config.status);
  client.user.setActivity(config.activity);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
});

const strip = (html) => {
  const dom = new JSDOM(html);
  return dom.window.document.body.textContent || "";
};

const Descriptions = (description) => {
  const stripped = strip(description || '');
  const limit = 200;
  return stripped.length > limit ? `${stripped.substring(0, limit)}...` : stripped;
};

const Raw_Script = async (raw_scripts) => {
  if (!raw_scripts) return 'No raw script URL provided.';
  try {
    const response = await fetch(raw_scripts);
    if (!response.ok) {
      console.error(`Failed to fetch raw script: ${response.statusText}`);
      return 'Error fetching script content.';
    }
    const text = await response.text();
    return text.length > 900 ? `${text.substring(0, 900)}...` : text;
  } catch (error) {
    console.error('Error fetching raw script:', error);
    return 'Error fetching script content.';
  }
};

const Embeds = (script, raw_content, page, maxPages) => {
  const user = script.user || { username: 'Unknown', image: null, verified: false };
  const pfpUrl = user.image || 'https://img.getimg.ai/generated/img-u1vYyfAtK7GTe9OK1BzeH.jpeg';
  const description = Descriptions(script.description || 'No description available');

  const gameTitle = (script.game && script.game.title) || script.title || 'Universal Script';

  const keyFieldValue = script.keySystem ? '🔑 Requires Key' : '🆓 No Key';

  const fields = [
    { name: 'Game', value: gameTitle, inline: true },
    { name: 'Verified', value: user.verified ? '✔️ Verified' : '❌ Not Verified', inline: true },
    { name: 'Script Type', value: script.paid ? 'Paid' : 'Free', inline: true },
    { name: 'Universal', value: script.universal ? '✔️ Universal' : '❌ Not Universal', inline: true },
    { name: 'Views', value: script.views?.toString() || '0', inline: true },
    { name: 'Likes', value: script.likes?.toString() || '0', inline: true },
    { name: 'Dislikes', value: script.dislikes?.toString() || '0', inline: true },
    { name: 'Key', value: keyFieldValue, inline: true },
    { name: 'Patched', value: script.patched ? '❌ Patched' : '✔️ Not Patched', inline: true },
    { name: 'Mobile Ready', value: script.mobileReady ? '✔️ Mobile Ready' : '❌ Not Mobile Ready', inline: true },
    { name: 'Created At', value: script.createdAt ? new Date(script.createdAt).toLocaleString() : 'N/A', inline: true }
  ];

  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(script.title || 'No Title')
    .setURL(`https://rscripts.net/script/${script.slug || script._id}`)
    .setAuthor({ name: user.username, iconURL: pfpUrl })
    .setThumbnail((script.game && script.game.imgurl) || script.image || 'https://media1.tenor.com/m/j9Jhn5M1Xw0AAAAd/neuro-sama-ai.gif')
    .setDescription(description)
    .addFields(fields)
    .addFields(
      { name: 'The Script', value: `\`\`\`lua\n${raw_content}\n\`\`\`` },
      { name: 'Links', value: `[Raw Script](${script.rawScript || 'N/A'}) - [Script Page](https://rscripts.net/script/${script.slug || script._id})` }
    )
    .setTimestamp()
    .setImage((script.game && script.game.imgurl) || script.image || 'https://media1.tenor.com/m/j9Jhn5M1Xw0AAAAd/neuro-sama-ai.gif')
    .setFooter({ text: `Page ${page} of ${maxPages}` });
};

const ScriptBloxEmbed = (script, raw_content, page, maxPages) => {
  const owner = script.owner || { username: 'Unknown' };
  const game = script.game || { name: 'Universal Script', imageUrl: null };
  const description = Descriptions(script.description || 'No description available');

  const fields = [
    { name: 'Game', value: game.name, inline: true },
    { name: 'Views', value: script.views?.toString() || '0', inline: true },
    { name: 'Verified', value: script.verified ? '✔️ Verified' : '❌ Not Verified', inline: true },
    { name: 'Key System', value: script.key ? '🔑 Requires Key' : '🆓 No Key', inline: true },
    { name: 'Patched', value: script.isPatched ? '❌ Patched' : '✔️ Not Patched', inline: true },
    { name: 'Created At', value: script.createdAt ? new Date(script.createdAt).toLocaleString() : 'N/A', inline: true }
  ];

  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(script.title || 'No Title')
    .setURL(`https://scriptblox.com/script/${script.slug || script._id}`)
    .setAuthor({ name: owner.username, iconURL: 'https://scriptblox.com/favicon.ico' })
    .setThumbnail(game.imageUrl || 'https://media1.tenor.com/m/j9Jhn5M1Xw0AAAAd/neuro-sama-ai.gif')
    .setDescription(description)
    .addFields(fields)
    .addFields(
      { name: 'The Script', value: `\`\`\`lua\n${raw_content}\n\`\`\`` },
      { name: 'Links', value: `[Script Page](https://scriptblox.com/script/${script.slug || script._id})` }
    )
    .setTimestamp()
    .setImage(game.imageUrl || 'https://media1.tenor.com/m/j9Jhn5M1Xw0AAAAd/neuro-sama-ai.gif')
    .setFooter({ text: `ScriptBlox - Page ${page} of ${maxPages}` });
};

const fetchScripts = async (query, page = 1, mode = null) => {
  try {
    let url = `${Rscripts}/scripts?query=${encodeURIComponent(query)}&page=${page}`;
    if (mode) {
      url += `&mode=${mode}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    if (!data.scripts || data.scripts.length === 0) {
      return { scripts: [], info: { currentPage: page, maxPages: page } };
    }
    return data;
  } catch (error) {
    console.error('Error fetching scripts:', error);
    throw error;
  }
};

const fetchScriptBlox = async (query, page = 1) => {
  try {
    const response = await fetch(`${ScriptBlox}?q=${encodeURIComponent(query)}&page=${page}`);
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }
    const data = await response.json();
    if (!data.result || !data.result.scripts || data.result.scripts.length === 0) {
      return { scripts: [], totalPages: 1 };
    }
    return {
      scripts: data.result.scripts,
      totalPages: data.result.totalPages || 1
    };
  } catch (error) {
    console.error('Error fetching ScriptBlox scripts:', error);
    throw error;
  }
};

const getActionRow = (page, type, totalPages) => {
  const firstButton = new ButtonBuilder()
    .setCustomId(`first_${type}_page`)
    .setEmoji('<:rewind1:1396907328283873486>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === 0);

  const prevButton = new ButtonBuilder()
    .setCustomId(`prev_${type}_page`)
    .setEmoji('<:next:1396907441807167528>')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  const nextButton = new ButtonBuilder()
    .setCustomId(`next_${type}_page`)
    .setEmoji('<:icons_next:1396907563504636026>')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  const lastButton = new ButtonBuilder()
    .setCustomId(`last_${type}_page`)
    .setEmoji('<:forward:1396907680769245284>')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(page === totalPages - 1);
  const stopButton = new ButtonBuilder()
    .setCustomId(`stop_${type}_page`)
    .setEmoji('<:delete:1396907789112053821>')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(false);
  return new ActionRowBuilder().addComponents(firstButton, prevButton, nextButton, lastButton, stopButton);
};

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Check if command is used in DM
  if (!interaction.guildId) {
    return interaction.reply({ content: ':x: Slash commands only work on servers', ephemeral: true });
  }

  if (interaction.commandName === 'script') {
    if (interaction.options.getSubcommand() === 'rscripts') {
      const query = interaction.options.getString('query');

      if (!query) {
        return interaction.reply({ content: 'Please provide a search query.', ephemeral: true });
      }

      await interaction.deferReply();

      let page = 1;
      let data;

      try {
        data = await fetchScripts(query, page);
      } catch (error) {
        return interaction.editReply('An error occurred while fetching scripts.');
      }

      if (!data.scripts.length) {
        return interaction.editReply('No scripts found for the given query.');
      }

      let script = data.scripts[0];
      const raw_scripts = script.rawScript || (script.download ? `https://rscripts.net/raw/${script.download}` : null);
      const raw_content = await Raw_Script(raw_scripts);
      let embed = Embeds(script, raw_content, page, data.info.maxPages);
      let row = getActionRow(page - 1, 'script', data.info.maxPages);

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      const filter = i => ['first_script_page', 'prev_script_page', 'next_script_page', 'last_script_page', 'stop_script_page'].includes(i.customId) && i.user.id === interaction.user.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        try {
          if (i.customId === 'first_script_page') {
            page = 1;
          } else if (i.customId === 'prev_script_page' && page > 1) {
            page--;
          } else if (i.customId === 'next_script_page') {
            page++;
          } else if (i.customId === 'last_script_page') {
            const tempData = await fetchScripts(query, 1);
            page = tempData.info.maxPages;
          } else if (i.customId === 'stop_script_page') {
            collector.stop();
            return;
          }

          const newData = await fetchScripts(query, page);
          if (!newData.scripts.length) {
            return i.reply({ content: 'No scripts found on this page.', ephemeral: true });
          }
          script = newData.scripts[0];
          const new_raw_scripts = script.rawScript || (script.download ? `https://rscripts.net/raw/${script.download}` : null);
          const new_raw_content = await Raw_Script(new_raw_scripts);
          embed = Embeds(script, new_raw_content, page, newData.info.maxPages);
          row = getActionRow(page - 1, 'script', newData.info.maxPages);
          await i.update({ embeds: [embed], components: [row] });
        } catch (err) {
          console.error('Error during pagination:', err);
          await i.reply({ content: 'An error occurred while updating the script.', ephemeral: true });
        }
      });

      collector.on('end', () => {
        msg.edit({ components: [] });
      });
    } else if (interaction.options.getSubcommand() === 'scriptblox') {
      const query = interaction.options.getString('query');

      if (!query) {
        return interaction.reply({ content: 'Please provide a search query.', ephemeral: true });
      }

      await interaction.deferReply();

      let page = 1;
      let data;

      try {
        data = await fetchScriptBlox(query, page);
      } catch (error) {
        return interaction.editReply('An error occurred while fetching scripts from ScriptBlox.');
      }

      if (!data.scripts.length) {
        return interaction.editReply('No scripts found for the given query on ScriptBlox.');
      }

      let script = data.scripts[0];
      const raw_content = script.script ? (script.script.length > 900 ? `${script.script.substring(0, 900)}...` : script.script) : 'No script content available.';
      let embed = ScriptBloxEmbed(script, raw_content, page, data.totalPages);
      let row = getActionRow(page - 1, 'scriptblox', data.totalPages);

      const msg = await interaction.editReply({ embeds: [embed], components: [row] });
      const filter = i => ['first_scriptblox_page', 'prev_scriptblox_page', 'next_scriptblox_page', 'last_scriptblox_page', 'stop_scriptblox_page'].includes(i.customId) && i.user.id === interaction.user.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async i => {
        try {
          if (i.customId === 'first_scriptblox_page') {
            page = 1;
          } else if (i.customId === 'prev_scriptblox_page' && page > 1) {
            page--;
          } else if (i.customId === 'next_scriptblox_page') {
            page++;
          } else if (i.customId === 'last_scriptblox_page') {
            page = data.totalPages;
          } else if (i.customId === 'stop_scriptblox_page') {
            collector.stop();
            return;
          }

          const newData = await fetchScriptBlox(query, page);
          if (!newData.scripts.length) {
            return i.reply({ content: 'No scripts found on this page.', ephemeral: true });
          }
          script = newData.scripts[0];
          const new_raw_content = script.script ? (script.script.length > 900 ? `${script.script.substring(0, 900)}...` : script.script) : 'No script content available.';
          embed = ScriptBloxEmbed(script, new_raw_content, page, newData.totalPages);
          row = getActionRow(page - 1, 'scriptblox', newData.totalPages);
          await i.update({ embeds: [embed], components: [row] });
        } catch (err) {
          console.error('Error during ScriptBlox pagination:', err);
          await i.reply({ content: 'An error occurred while updating the script.', ephemeral: true });
        }
      });

      collector.on('end', () => {
        msg.edit({ components: [] });
      });
    }
  }
});

client.login(config.token);
