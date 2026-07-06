/**
 * Shared collapse/expand behavior for section toggles.
 *
 * One implementation of the max-height slide animation +
 * aria-expanded/is-collapsed/aria-hidden bookkeeping used by the sphere-index
 * section toggles and the archetypes-index class-group toggles. Dispatches
 * `class-feature-collapse` (when a sectionId is provided) so the sidebar TOC
 * can sync its accordion state.
 */

function animate(target: HTMLElement, expand: boolean) {
  target.style.overflow = 'hidden';
  target.style.maxHeight = target.scrollHeight + 'px';
  if (!expand) {
    requestAnimationFrame(() => { target.style.maxHeight = '0'; });
  } else {
    target.addEventListener('transitionend', () => {
      target.style.maxHeight = '';
      target.style.overflow = 'visible';
    }, { once: true });
  }
}

export function setCollapsibleState(
  btn: HTMLButtonElement,
  target: HTMLElement,
  expand: boolean,
  sectionId?: string,
) {
  animate(target, expand);
  btn.setAttribute('aria-expanded', String(expand));
  btn.classList.toggle('is-collapsed', !expand);
  target.setAttribute('aria-hidden', String(!expand));
  if (sectionId) {
    document.dispatchEvent(new CustomEvent('class-feature-collapse', {
      detail: { id: sectionId, collapsed: !expand },
    }));
  }
}

export function bindCollapseToggle(
  btn: HTMLButtonElement,
  target: HTMLElement,
  sectionId?: string,
) {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    setCollapsibleState(btn, target, !expanded, sectionId);
  });
}
