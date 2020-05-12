// TODO: Do permissions checks before every action.
process.chdir('/home/zlyfer/DiscordBots/DiscordDynChanBot');
const Discord = require('discord.js');
const client = new Discord.Client();

const fs = require("fs");
const token = require("./token.json");
const guildConfigFolder = "./guildConfig/";
const configTemplate = require("./configTemplate.json");
const botPrefix = "~zldc~";

function applyUserRolesPermissions(guild, guildConfig, creator, channel) {
	if (checkPerm(guild, "MANAGE_ROLES")) {
		if (guildConfig.userRoles.indexOf("@everyone") == -1) {
			let role = guild.roles.find('name', "@everyone");
			if (role) {
				channel.overwritePermissions(role, {
					"VIEW_CHANNEL": false
				});
			}
		}
		// channel.overwritePermissions(creator, {
		// 	"VIEW_CHANNEL": true
		// });
		if (guildConfig.userRoles.indexOf("@everyone") == -1) {
			let guildroles = guild.roles.array();
			let allow = true;
			for (let i = 0; i < guildroles.length; i++) {
				let userRole = guildroles[i].name;
				let role = guild.roles.find('name', userRole);
				if (role) {
					if (guildConfig.userRoles.indexOf(userRole) != -1) {
						allow = true;
					} else {
						allow = false;
					}
					channel.overwritePermissions(role, {
						"VIEW_CHANNEL": allow
					});
				}
			}
		}
	}
}

function secureName(name) {
	name = name.replace(new RegExp("'", 'g'), '');
	name = name.replace(new RegExp('’', 'g'), '');
	name = name.replace(new RegExp('`', 'g'), '');
	name = name.replace(new RegExp(' - ', 'g'), ' ');
	name = name.replace(new RegExp('- ', 'g'), ' ');
	name = name.replace(new RegExp(' -', 'g'), ' ');
	name = name.replace(new RegExp('-', 'g'), ' ');
	name = name.replace(/ [^\w\s!] |[^\w\s!] | [^\w\s!]/gi, ' ')
	name = name.replace(/[^\w\s!]/gi, '');
	return name;
}

function getConfig(guildID) {
	var cfile = guildConfigFolder + guildID + ".json";
	if (fs.existsSync(cfile)) {
		var config = require(cfile);
	} else {
		var config = configTemplate;
	}
	return config;
}

function checkPerm(guild, permission) {
	const botID = client.user.id;
	var hasPerm = guild.members.find('id', botID).hasPermission(permission);
	return (hasPerm)
}

function applyChanges(guild, changeObj) {
	var guildConfig = getConfig(guild.id);
	var channels = guild.channels.array();
	let p;
	for (var channel = 0; channel < channels.length; channel++) {
		var cchannel = channels[channel];
		var channelType = cchannel.type;
		var channelName = cchannel.name;
		if (checkPerm(guild, "MANAGE_CHANNELS")) {
			if (channelType == "category") {
				if (guildConfig.category != false) {
					if (changeObj.category == channelName) {
						cchannel.edit({
							name: guildConfig.category
						});
					}
				}
			}
		}
		if (channelType == "voice") {
			if (channelName.indexOf(guildConfig.channelPrefix) != -1 || channelName.indexOf(changeObj.channelPrefix) != -1) {
				if (checkPerm(guild, "MANAGE_CHANNELS")) {
					channelName = channelName.replace(changeObj.channelPrefix, guildConfig.channelPrefix);
					cchannel.edit({
						name: channelName,
						userLimit: guildConfig.userLimit
					});
				}
				if (checkPerm(guild, "MANAGE_ROLES")) {
					var creatorName = channelName.replace(guildConfig.channelPrefix + " ", "");
					var member = guild.members.find('displayName', creatorName);
					if (member) {
						p = {};
						p["MUTE_MEMBERS"] = guildConfig.givePermissions;
						p["DEAFEN_MEMBERS"] = guildConfig.givePermissions;
						p["MANAGE_CHANNELS"] = guildConfig.giveChannelPermissions;
						cchannel.overwritePermissions(member.user, p)
							.then(console.log("Applied changes."));
					}
					applyUserRolesPermissions(guild, guildConfig, member, cchannel);
				}
			}
		}
	}
}

function changeConfig(guild, key, newValue) {
	var guildFile = guildConfigFolder + guild.id + ".json";
	var guildConfig = getConfig(guild.id);
	var changeObj = {
		"category": guildConfig.category,
		"channelPrefix": guildConfig.channelPrefix
	};
	if (newValue == "true") {
		newValue = true;
	} else if (newValue == "false") {
		newValue = false;
	}
	guildConfig[key] = newValue;
	fs.writeFileSync(guildFile, JSON.stringify(guildConfig), 'utf-8')
	applyChanges(guild, changeObj);
}

function configSetup() {
	var guilds = client.guilds.array();
	for (guild = 0; guild < guilds.length; guild++) {
		var guildFile = guildConfigFolder + guilds[guild].id + ".json";
		if (!fs.existsSync(guildFile)) {
			fs.writeFileSync(guildFile, JSON.stringify(configTemplate), 'utf-8');
		} else {
			var config = require(guildFile);
			var change = false;
			for (var key in configTemplate) {
				if (!(key in config)) {
					config[key] = configTemplate[key];
					change = true;
				}
			}
			if (change == true) {
				fs.writeFileSync(guildFile, JSON.stringify(config), 'utf-8');
			}
		}
	}
}

client.on('ready', () => {
	client.user.setPresence({
			"status": "online",
			"afk": false,
			"game": {
				"name": "Use " + botPrefix + "help for help!"
			}
		})
		.then(console.log("Bot ready."));
	configSetup();
})

client.on('guildCreate', (guild) => {
	configSetup();
})

client.on('channelUpdate', (oldChannel, newChannel) => {
	var guild = oldChannel.guild;
	var guildConfig = getConfig(guild.id);
	if (
		oldChannel.name.indexOf(guildConfig.channelPrefix) != -1 &&
		newChannel.name.indexOf(guildConfig.channelPrefix) == -1
	) {
		oldChannel.setName(oldChannel.name, "Preventing errors.");
	}
});

client.on('voiceStateUpdate', (oldMember, newMember) => {
	var guild = newMember.guild;
	var guildConfig = getConfig(guild.id);
	if (guildConfig.enable) {
		if (oldMember.voiceChannel != undefined) {
			var channel = oldMember.voiceChannel;
			var channelName = channel.name;
			if (channelName.indexOf(guildConfig.channelPrefix) == 0) {
				var members = channel.members.array();
				if (members.length == 0) {
					if (checkPerm(guild, "MANAGE_CHANNELS")) {
						channel.delete();
					}
				} else {
					var memberName = oldMember.user.username;
					if (channelName.indexOf(memberName) != -1) {
						var channelChange = true;
						if (newMember.voiceChannel != undefined) {
							var newChannel = newMember.voiceChannel;
							if (newChannel.id == channel.id) {
								var channelChange = false;
							}
						}
						if (channelChange == true) {
							var members = guild.members.array();
							let oMP, nMP;
							for (var member = 0; member < members.length; member++) {
								var voiceChannelID = members[member].voiceChannelID;
								if (voiceChannelID == channel.id) {
									var newOwner = members[member];
									if (channelChange == true) {
										if (memberName != newOwner.user.username) {
											if (checkPerm(guild, "MANAGE_CHANNELS")) {
												channel.edit({
													name: guildConfig.channelPrefix + " " + newOwner.user.username
												});
											}
											if (guildConfig.givePermissions || guildConfig.giveChannelPermissions) {
												if (checkPerm(guild, "MANAGE_ROLES")) {
													oMP = {};
													nMP = {};
													if (guildConfig.givePermissions) {
														oMP["MUTE_MEMBERS"] = false;
														oMP["DEAFEN_MEMBERS"] = false;
														nMP["MUTE_MEMBERS"] = true;
														nMP["DEAFEN_MEMBERS"] = true;
														console.log(nMP);
														console.log(newOwner);
													}
													if (guildConfig.giveChannelPermissions) {
														oMP["MANAGE_CHANNELS"] = false;
														nMP["MANAGE_CHANNELS"] = true;
													}
													channel.overwritePermissions(oldMember, oMP)
														.then(console.log("Changed permissions for a old member."));
													channel.overwritePermissions(newOwner, nMP)
														.then(console.log("Changed permissions for a new member."));
												}
											}
											channelChange = false;
										}
									}
								}
							}
							applyUserRolesPermissions(guild, guildConfig, newOwner, channel);
							// if (checkPerm(guild, "MANAGE_ROLES")) {
							// let role = guild.roles.find('name', "@everyone");
							// if (role) {
							//   channel.overwritePermissions(oldMember, {
							//       "VIEW_CHANNEL": false
							//     })
							//     .then(console.log("Changed some permissions for userRoles."));
							// }
							// }
						}
					}
				}
			}
		}
		if (newMember.voiceChannel != undefined) {
			var guild = newMember.guild;
			var guildConfig = getConfig(guild.id);
			if (newMember.voiceChannel.name == guildConfig.mainChannel) {
				if (checkPerm(guild, "MANAGE_CHANNELS")) {
					guild.createChannel(guildConfig.channelPrefix + " " + newMember.user.username, "voice");
				}
			}
		}
	}
})

client.on('channelCreate', (channel) => {
	var guild = channel.guild;
	var guildConfig = getConfig(guild.id);
	if (guildConfig.enable) {
		var type = channel.type;
		if (type == "voice") {
			var name = channel.name;
			if (name.indexOf(guildConfig.channelPrefix) == 0) {
				if (guildConfig.category != false) {
					var channels = guild.channels.array();
					var categoryExists = false;
					for (var channeli = 0; channeli < channels.length; channeli++) {
						if (channels[channeli].type == "category") {
							if (channels[channeli].name == guildConfig.category) {
								if (checkPerm(guild, "MANAGE_CHANNELS")) {
									channel.setParent(channels[channeli].id);
								}
								categoryExists = true;
							}
						}
					}
					if (categoryExists == false) {
						changeConfig(guild, "category", "false");
					}
				}
				var creatorName = name.replace(guildConfig.channelPrefix + " ", "");
				var members = guild.members.array();
				let p;
				for (var member = 0; member < members.length; member++) {
					if (members[member].user.username == creatorName) {
						var creator = members[member];
						if (checkPerm(guild, "MOVE_MEMBERS")) {
							creator.edit({
								channel: channel
							});
						}
						if (checkPerm(guild, "MANAGE_CHANNELS")) {
							channel.edit({
								userLimit: guildConfig.userLimit
							});
						}
						if (guildConfig.givePermissions || guildConfig.giveChannelPermissions) {
							if (checkPerm(guild, "MANAGE_ROLES")) {
								p = {};
								p["MUTE_MEMBERS"] = guildConfig.givePermissions;
								p["DEAFEN_MEMBERS"] = guildConfig.givePermissions;
								p["MANAGE_CHANNELS"] = guildConfig.giveChannelPermissions;
								channel.overwritePermissions(creator, p);
							}
						}
						applyUserRolesPermissions(guild, guildConfig, creator, channel);
					}
				}
			}
		}
	}
})

client.on('message', (message) => {
	var content = message.content;
	if (message.author.bot == false && content.indexOf(botPrefix) != -1) {
		if (message.channel.type == "text") {
			content = content.replace(botPrefix, "");
			var guildConfig = getConfig(message.guild.id);
			var hasRights = false;
			if (guildConfig.configRole != false) {
				roles = message.member.roles.array();
				for (var role = 0; role < roles.length; role++) {
					rolename = roles[role].name;
					if (rolename == guildConfig.configRole) {
						hasRights = true;
					}
				}
			}
			if (hasRights == false) {
				var author = message.author.id;
				var owner = message.member.guild.ownerID;
				if (author == owner) {
					hasRights = true;
				}
			}
			if (hasRights == true) {
				var cmd = String(content).split(" ")[0];
				var newValue = String(content).replace(cmd + " ", "").replace(cmd + "", "");
				var changeValid = false;
				switch (cmd) {
					case "help":
						var helpObj = {
							"help": {
								"parameter": "none",
								"desc": "Shows this help message."
							},
							"showSettings": {
								"parameter": "none",
								"desc": "Displays the current settings and their values."
							},
							"enable": {
								"parameter": "true/false",
								"desc": "This command can enable and disable the bot."
							},
							"mainChannel": {
								"parameter": "text",
								"desc": "Specifies the channel which triggers the bot."
							},
							"category": {
								"parameter": "text/false",
								"desc": "Specifies the category within the temporary channel are created. Use 'false' for no category."
							},
							"userLimit": {
								"parameter": "number",
								"desc": "Specifies the user limit the temporary channel should have. Use '0' for unlimited."
							},
							"channelPrefix": {
								"parameter": "text",
								"desc": "Specifies the prefix of the temporary channels."
							},
							"givePermissions": {
								"parameter": "true/false",
								"desc": "Specifies whether the channel 'creator' should get mute and deaf rights for that channel or not."
							},
							"giveChannelPermissions": {
								"parameter": "true/false",
								"desc": "Specifies whether the channel 'creator' should get the permissions to change the channel itself or not."
							},
							"configRole": {
								"parameter": "text/false",
								"desc": "Specifies the role the bot listens to. 'false' = owner only."
							},
							"userRoles": {
								"parameter": "text",
								"desc": "Specify a list of roles who can actually see the temporary channels. If a given role is already present in the list it will be removed from it. Can be comma-seperated: 'Admins, Moderators, Users'."
							}
						}
						var reply = "help is on the way:\n";
						reply += "Make sure to use **" + botPrefix + "** as prefix!\n";
						reply += "The format is: **COMMAND** __PARAMETER__ - *DESCRIPTION*.\n\n";
						for (var key in helpObj) {
							reply += "**" + key + "** __" + helpObj[key].parameter + "__ - *" + helpObj[key].desc + "*\n";
						}
						reply += "\nINFO: If you encounter any issues or have questions, feel free to contact me.\n";
						message.reply(reply);
						break;
					case "showSettings":
						var reply = "these are the current settings and their values:\n";
						for (var key in guildConfig) {
							let value = guildConfig[key];
							if (Array.isArray(guildConfig[key]) == true) {
								if (guildConfig[key].length == 0) {
									value = "None";
								}
							}
							reply += "**" + key + "**: __" + value + "__\n";
						}
						message.reply(reply);
						break;
					case "enable":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
						break;
					case "mainChannel":
						if (newValue == guildConfig.channelPrefix) {
							message.reply("**mainChannel** must not be the same as **channelPrefix**.");
						} else if (newValue[0] == guildConfig.channelPrefix[0]) {
							message.reply("**mainChannel** must not start with the same character as **channelPrefix**.");
						} else {
							changeValid = true;
						}
						break;
					case "category":
						if (newValue.length < 1) {
							message.reply("you need to specify at least one character.");
						} else {
							changeValid = true;
						}
						break;
					case "userLimit":
						changeValid = /^[0-9]{1,2}$/i.test(newValue);
						if (changeValid == false) {
							message.reply("you need to specify a number between 0 and 99.");
						}
						break;
					case "channelPrefix":
						if (newValue.length < 1) {
							message.reply("you need to specify at least one character.");
						} else if (newValue == guildConfig.mainChannel) {
							message.reply("**channelPrefix** must not be the same as **mainChannel**.");
						} else if (newValue[0] == guildConfig.mainChannel[0]) {
							message.reply("**channelPrefix** must not start with the same character as **mainChannel**.");
						} else {
							changeValid = true;
						}
						break;
					case "givePermissions":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
					case "giveChannelPermissions":
						if (newValue == "true" || newValue == "false") {
							changeValid = true;
						} else {
							message.reply("please use either true or false.");
						}
						break;
					case "configRole":
						if (newValue == "false") {
							changeValid = true;
						} else {
							var role = message.guild.roles.find("name", newValue);
							if (role == null) {
								message.reply("you need to specifiy an existing role. Please add the role **" + newValue + "** and try again.");
							} else {
								changeValid = true;
							}
						}
						break;
					case "userRoles":
						if (newValue.length > 0 && newValue[0] != ",") {
							var newValues = newValue.split(',');
							for (let i = 0; i < newValues.length; i++) {
								let nv = newValues[i];
								if (nv.length > 0 && nv != '"' && nv != "'" && nv != ',') {
									// nv = secureName(nv);
									// nv = nv.toLowerCase();
									if (nv[0] == " ") {
										nv = nv.slice(1);
									}
									let iof = guildConfig.userRoles.indexOf(nv);
									let role = message.guild.roles.find("name", nv);
									if (iof != -1) {
										changeValid = true;
										guildConfig.userRoles.splice(iof, 1);
									} else if (role) {
										changeValid = true;
										guildConfig.userRoles.push(nv);
									} else {
										message.reply(`could not add **${nv}** to the list since it's not a existing role.`);
									}
								}
							}
							newValue = guildConfig.userRoles;
						} else {
							message.reply("you need to specify at least one existing role.");
						}
						break;
				}
				if (changeValid == true) {
					changeConfig(message.guild, cmd, newValue);
					if (Array.isArray(newValue) == true) {
						if (newValue.length == 0) {
							newValue = "None";
						}
					}
					message.reply("**" + cmd + "** *has been changed to* **" + newValue + "**.");
				}
			} else {
				message.reply("sorry but you seem to lack on rights to use me.")
			}
		} else {
			message.reply("sorry, but I am supposed to be controlled via a text channel on a discord server.");
		}
	}
});

process.on('unhandledRejection', (err) => {
	console.error(err);
})

client.login(token.token);