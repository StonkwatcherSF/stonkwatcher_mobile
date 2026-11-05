import type { Alert as NativeAlert } from "react-native";

// Native Alert is a no-op in react-native-web. A modal dialog keeps button
// labels, cancellation, keyboard focus, and destructive-action callbacks intact.
export const Alert: Pick<typeof NativeAlert, "alert"> = {
  alert(title, message, buttons, options) {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", title ?? "");
    dialog.style.cssText = "background:#161b0b;color:white;border:1px solid #687b13;border-radius:16px;padding:24px;width:min(360px,calc(100vw - 48px));box-sizing:border-box;font:16px system-ui;";
    const heading = document.createElement("h2");
    heading.textContent = title ?? "";
    heading.style.cssText = "font-size:20px;margin:0 0 12px";
    const body = document.createElement("p");
    body.textContent = message ?? "";
    body.style.cssText = "line-height:1.5;white-space:pre-wrap";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap";
    const choices = buttons?.length ? buttons : [{ text: "OK" }];
    const close = () => { dialog.close(); dialog.remove(); };
    for (const choice of choices) {
      const button = document.createElement("button");
      button.textContent = choice.text ?? "OK";
      button.style.cssText = `border:0;border-radius:8px;padding:12px 18px;font:inherit;cursor:pointer;background:${choice.style === "cancel" ? "#303326" : "#c6e900"};color:${choice.style === "cancel" ? "white" : "#101010"}`;
      button.onclick = () => { close(); choice.onPress?.(); };
      actions.append(button);
    }
    dialog.oncancel = (event) => {
      event.preventDefault();
      const cancel = choices.find((choice) => choice.style === "cancel");
      if (cancel || options?.cancelable) {
        close();
        cancel?.onPress?.();
        options?.onDismiss?.();
      }
    };
    dialog.append(heading, body, actions);
    document.body.append(dialog);
    dialog.showModal();
  },
};
