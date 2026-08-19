// Tiny event bus so any page can open the global assistant widget.

export const ASSISTANT_OPEN_EVENT = 'scs-assistant-open';

export function openAssistant(topic?: 'estimate') {
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT, { detail: { topic } }));
}
