export type DialogRequest =
  | { kind: "confirm"; title: string; message: string; resolve: (value: boolean) => void }
  | { kind: "text"; title: string; message: string; defaultValue: string; required?: boolean; resolve: (value: string | null) => void };

const EVENT_NAME = "nex:dialog-request";

export function requestConfirmation(title: string, message: string) {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent<DialogRequest>(EVENT_NAME, { detail: { kind: "confirm", title, message, resolve } }));
  });
}

export function requestTextInput(title: string, message: string, defaultValue = "", required = true) {
  return new Promise<string | null>((resolve) => {
    window.dispatchEvent(new CustomEvent<DialogRequest>(EVENT_NAME, { detail: { kind: "text", title, message, defaultValue, required, resolve } }));
  });
}

export const dialogRequestEvent = EVENT_NAME;
