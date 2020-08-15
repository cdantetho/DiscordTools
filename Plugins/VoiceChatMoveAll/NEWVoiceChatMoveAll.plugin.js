//META{"name":"VoiceChatMoveAll","source":"https://gitlab.com/_Lighty_/bdstuff/blob/master/public/plugins/VoiceChatMoveAll.plugin.js","website":"https://_lighty_.gitlab.io/bdstuff/?plugin=VoiceChatMoveAll"}*//
class VoiceChatMoveAll {
  constructor(props) {
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }
  getName() {
    return 'VCMoveAll';
  }
  getVersion() {
    return '1.0.0';
  }
  getAuthor() {
    return 'Dante';
  }
  getDescription() {
    return 'If you have the move members permission and are in a VoiceChannel with some people, it gives you a context menu option when right clicking other voice channels to move all members to that channel.';
  }
  load() {}
  start() {
    let onLoaded = () => {
      try {
        if (!global.ZeresPluginLibrary) setTimeout(onLoaded, 1000);
        else this.initialize();
      } catch (err) {
        ZeresPluginLibrary.Logger.stacktrace(this.getName(), 'Failed to start!', err);
        ZeresPluginLibrary.Logger.err(this.getName(), `If you cannot solve this yourself, contact ${this.getAuthor()} and provide the errors shown here.`);
        this.stop();
        this.showToast(`[${this.getName()}] Failed to start! Check console (CTRL + SHIFT + I, click console tab) for more error info.`, { type: 'error', timeout: 10000 });
      }
    };
    const getDir = () => {
      // from Zeres Plugin Library, copied here as ZLib may not be available at this point
      const process = require('process');
      const path = require('path');
      if (process.env.injDir) return path.resolve(process.env.injDir, 'plugins/');
      switch (process.platform) {
        case 'win32':
          return path.resolve(process.env.appdata, 'BetterDiscord/plugins/');
        case 'darwin':
          return path.resolve(process.env.HOME, 'Library/Preferences/', 'BetterDiscord/plugins/');
        default:
          return path.resolve(process.env.XDG_CONFIG_HOME ? process.env.XDG_CONFIG_HOME : process.env.HOME + '/.config', 'BetterDiscord/plugins/');
      }
    };
    this.pluginDir = getDir();

    if (!global.XenoLib || !global.ZeresPluginLibrary) {
      const XenoLibMissing = !global.XenoLib;
      const zlibMissing = !global.ZeresPluginLibrary;
      const bothLibsMissing = XenoLibMissing && zlibMissing;
      const header = `Missing ${(bothLibsMissing && 'Libraries') || 'Library'}`;
      const content = `The ${(bothLibsMissing && 'Libraries') || 'Library'} ${(zlibMissing && 'ZeresPluginLibrary') || ''} ${(XenoLibMissing && (zlibMissing ? 'and XenoLib' : 'XenoLib')) || ''} required for ${this.getName()} ${(bothLibsMissing && 'are') || 'is'} missing.`;
      const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
      const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
      const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
      const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${(zlibMissing && '<br/><a href="https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>') || ''}${(zlibMissing && '<br/><a href="http://localhost:7474/XenoLib.js"target="_blank">Click here to download XenoLib</a>') || ''}`);
      if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
      ModalStack.push(props => {
        return BdApi.React.createElement(
          ConfirmationModal,
          Object.assign(
            {
              header,
              children: [BdApi.React.createElement(TextElement, { color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install ${(bothLibsMissing && 'them') || 'it'}.`] })],
              red: false,
              confirmText: 'Download Now',
              cancelText: 'Cancel',
              onConfirm: () => {
                const request = require('request');
                const fs = require('fs');
                const path = require('path');
                const waitForLibLoad = callback => {
                  if (!global.BDEvents) return callback();
                  const onLoaded = e => {
                    if (e !== 'ZeresPluginLibrary') return;
                    BDEvents.off('plugin-loaded', onLoaded);
                    callback();
                  };
                  BDEvents.on('plugin-loaded', onLoaded);
                };
                const onDone = () => {
                  if (!global.pluginModule || (!global.BDEvents && !global.XenoLib)) return;
                  if (!global.BDEvents || global.XenoLib) onLoaded();
                  else {
                    const listener = () => {
                      onLoaded();
                      BDEvents.off('xenolib-loaded', listener);
                    };
                    BDEvents.on('xenolib-loaded', listener);
                  }
                };
                const downloadXenoLib = () => {
                  if (global.XenoLib) return onDone();
                  request('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (error, response, body) => {
                    if (error) return onFail();
                    onDone();
                    fs.writeFile(path.join(this.pluginDir, '1XenoLib.plugin.js'), body, () => {});
                  });
                };
                if (!global.ZeresPluginLibrary) {
                  request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                    if (error) return onFail();
                    waitForLibLoad(downloadXenoLib);
                    fs.writeFile(path.join(this.pluginDir, '0PluginLibrary.plugin.js'), body, () => {});
                  });
                } else downloadXenoLib();
              }
            },
            props
          )
        );
      });
    } else onLoaded();
  }
  stop() {
    try {
      this.shutdown();
    } catch (err) {
      ZLibrary.Logger.stacktrace(this.getName(), 'Failed to stop!', err);
    }
  }

  initialize() {
    ZLibrary.PluginUpdater.checkForUpdate(this.getName(), this.getVersion(), 'https://_lighty_.gitlab.io/bdstuff/plugins/VoiceChatMoveAll.plugin.js');
    this.tools = {
      getSelectedVoiceChannelId: ZLibrary.WebpackModules.getByProps('getVoiceChannelId').getVoiceChannelId,
      moveUserVoiceChannel: ZLibrary.WebpackModules.getByProps('setChannel').setChannel
    };
    this.ContextMenuItem = ZLibrary.DiscordModules.ContextMenuItem;
    this.ContextMenuGroup = ZLibrary.DiscordModules.ContextMenuItemsGroup;
    this.ContextMenuActions = ZLibrary.DiscordModules.ContextMenuActions;

    this.moveTimeoutTime = 200;
    XenoLib.patchContext(this.handleContextMenu);
  }

  shutdown() {
    XenoLib.unpatchContext(this.handleContextMenu);
  }

  getVoiceChannel(id) {
    return ZLibrary.DiscordModules.ChannelStore.getChannel(id || this.tools.getSelectedVoiceChannelId());
  }

  canMoveInChannel(chan) {
    return ZLibrary.DiscordModules.Permissions.can(ZLibrary.DiscordModules.DiscordPermissions.MOVE_MEMBERS, ZLibrary.DiscordAPI.currentUser, chan);
  }

  buildMenu(setup) {
    const ret = ZLibrary.DCM.buildMenu(setup);
    return props => ret({...props, onClose: _ => {}});
  }

  handleContextMenu(thisObj, returnValue) {
    if (!returnValue || thisObj.props.type !== 'CHANNEL_LIST_VOICE') return;
    const chanId = thisObj.props.channel.id;
    const chan = this.getVoiceChannel();
    const targetChan = this.getVoiceChannel(chanId);
    if (!chan || !targetChan || !this.canMoveInChannel(chan) || !this.canMoveInChannel(targetChan) || chan.id === chanId || chan.guild_id !== targetChan.guild_id) return;
    

    returnValue.props.children[0].props.children.push(

      ZLibrary.DCM.openContextMenu(
        e,
        this.buildMenu([
          {
            type: 'group',
            items: [
              {
                label: 'Move All Here',
                action: () => {
                  this.ContextMenuActions.closeContextMenu();
                  const recipients = ZLibrary.WebpackModules.getByProps('getVoiceStatesForChannel').getVoiceStatesForChannel(chan);
                  let userIDX = 0;
                  const timeoutFunc = () => {
                    ZLibrary.DiscordModules.APIModule.patch({
                      url: ZLibrary.DiscordModules.DiscordConstants.Endpoints.GUILD_MEMBER(chan.guild_id, recipients[userIDX].userId),
                      body: {
                        channel_id: chanId
                      }
                    })
                      .then(e => {
                        if (e.status === 204) {
                          userIDX++;
                          if (userIDX < recipients.length) setTimeout(() => timeoutFunc(), this.moveTimeoutTime);
                        }
                      })
                      .catch(e => {
                        this.moveTimeoutTime += 50;
                        ZLibrary.Logger.warn(this.getName(), `Rate limited, new timeout ${this.moveTimeoutTime}`);
                        setTimeout(() => timeoutFunc(), this.moveTimeoutTime);
                      });
                  };
                  timeoutFunc();
                }
              }
            ]
          }
        ])
      )

    );
  }
}