import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { Store } from "./store";
import {
	SHORTCUT_DESCRIPTION,
	WIDGET_TOGGLE_SHORTCUT_DESCRIPTION,
} from "./strings";
import { refreshWidget } from "./ui/widget";

const toggleWidgetExpansion = (store: Store, ctx: ExtensionContext): void => {
	store.widgetExpanded = !store.widgetExpanded;
	refreshWidget(store, ctx, true);
};

export const registerShortcut = (pi: ExtensionAPI, store: Store): void => {
	pi.registerShortcut("ctrl+shift+g", {
		description: SHORTCUT_DESCRIPTION,
		handler: (ctx) => {
			refreshWidget(store, ctx, true);
		},
	});
	pi.registerShortcut("ctrl+shift+i", {
		description: WIDGET_TOGGLE_SHORTCUT_DESCRIPTION,
		handler: (ctx) => {
			toggleWidgetExpansion(store, ctx);
		},
	});
};
