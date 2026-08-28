/** Apply the desktop landmark or mobile modal semantics for the shared sidebar. */
export function setSidebarSemantics(
  sidebar: HTMLElement,
  mobile: boolean,
  open: boolean,
): void {
  if (!mobile) {
    sidebar.classList.remove("open");
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
    sidebar.removeAttribute("aria-hidden");
    return;
  }

  sidebar.setAttribute("aria-hidden", String(!open));
  if (open) {
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
  } else {
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
  }
}
