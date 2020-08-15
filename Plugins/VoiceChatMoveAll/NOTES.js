





















let hint = BDFDB.BDUtils.isPluginEnabled("MessageUtilities") ? BDFDB.BDUtils.getPlugin("MessageUtilities").getActiveShortcutString("Copy_Raw") : null;
let entries = [
    messageString && BDFDB.ContextMenuUtils.createItem(BDFDB.LibraryComponents.MenuItems.MenuItem, {
        label: BDFDB.LanguageUtils.LanguageStrings.COPY_TEXT + " (Raw)",
        id: BDFDB.ContextMenuUtils.createItemId(this.name, "copy-message"),
        hint: hint && (_ => {
            return BDFDB.ReactUtils.createElement(BDFDB.LibraryComponents.MenuItems.MenuHint, {
                hint: hint
            });
        }),
        action: _ => {
            BDFDB.ContextMenuUtils.close(e.instance);
            BDFDB.LibraryRequires.electron.clipboard.write({text:messageString});
        }
    }),