import {world} from './model.js';
import Hint from "./Hint.js";
import { formatText } from "./TextTemplate.js";
import "https://cdn.jsdelivr.net/npm/motion@latest/dist/motion.js";

 let roomNameEl
 let roomDescEl
 let messageEl
 let actionBarEl
 let inventoryEl
 let exitsMapEl
 let hintCardEl
 let hintTextEl
 let modalOverlay
 let hintModal
 let exitsModal
 let hintReveal
 let hintIndex
 let hintPrev
 let hintNext
 let openHints
 let openExits
 let toggleItems
 let inventoryPanel
 let itemsToggleIcon
 let itemCursorEl

	 let hintSystem;
	 let viewMessages = {};
   let isClosingModal = false;
   let modalMotionToken = 0;
   let motionBound = false;
   let cursorMotionToken = 0;

   const motionButtonSelector = [
    ".button",
    ".action-button",
    ".sidebar__item",
    ".sidebar__link",
    ".sidebar__toggle",
    ".exit-node",
    ".hint-button",
    ".hint-card__action",
    ".description-link"
   ].join(",");

 const state = {
  itemsCollapsed: true,
  selectedExitId: null,
  openModal: null,
  pointerX: 0,
  pointerY: 0,
  hasPointer: false,
  itemCursorVisible: false
};
 

 export function initView() {
    hintSystem = new Hint(world);
    roomNameEl = document.querySelector("#room-name");
    roomDescEl = document.querySelector("#room-description");
    messageEl = document.querySelector("#message-text");
    actionBarEl = document.querySelector("#action-bar");
    inventoryEl = document.querySelector("#inventory-list");
    exitsMapEl = document.querySelector("#exits-map");
    hintCardEl = document.querySelector("#hint-card");
    hintTextEl = document.querySelector("#hint-text");
    toggleItems = document.querySelector("#toggle-items");
    itemsToggleIcon = document.querySelector("#items-toggle-icon");
    modalOverlay = document.querySelector("#modal-overlay");
    hintModal = document.querySelector("#hint-modal");
    exitsModal = document.querySelector("#exits-modal");
    hintReveal = document.querySelector("#hint-reveal");
    hintIndex = document.querySelector("#hint-index");
    hintPrev = document.querySelector("#hint-prev");
    hintNext = document.querySelector("#hint-next");
    openHints = document.querySelector("#open-hints");
    openExits = document.querySelector("#open-exits");
    inventoryPanel = document.querySelector("#inventory-panel");
    itemsToggleIcon = document.querySelector("#items-toggle-icon");
    itemCursorEl = document.querySelector("#item-cursor");

    bindEvents();
    bindMotion();

    return {
        roomNameEl,
        roomDescEl,
        messageEl,
        actionBarEl,
        inventoryEl,
        exitsMapEl,
        hintCardEl,
        hintTextEl,
        modalOverlay,
        hintModal,
        exitsModal,
        hintReveal,
        hintIndex,
        hintPrev,
        hintNext,
        openHints,
        openExits,
        toggleItems,
        inventoryPanel,
        itemsToggleIcon,
        itemCursorEl
    }

 }

 export function setHintDefinitions(definitions, conditionTemplates) {
    hintSystem.setDefinitions(definitions, conditionTemplates);
 }

 export function setViewMessages(messages) {
    viewMessages = messages || {};
 }

 export function render() {

    const room = world.currentRoom;
    renderRoom(room);
    renderInventory();
    renderActions();
    renderMessage();
    renderExits(room);
    renderItemCursor();
 }

 function bindEvents() {
    toggleItems.addEventListener("click", () => {
      state.itemsCollapsed = !state.itemsCollapsed;
      renderItemsPanel();
    });

    openHints.addEventListener("click", () => openModal("hint"));
    openExits.addEventListener("click", () => openModal("exits"));

    hintPrev.addEventListener("click", () => {
      hintSystem.previous();
      renderHints();
    });

    hintNext.addEventListener("click", () => {
      hintSystem.next();
      renderHints();
    });

    hintReveal.addEventListener("click", () => {
      hintSystem.reveal();
      renderHints();
    });

    modalOverlay.addEventListener("click", (event) => {
      if (event.target === modalOverlay) {
        closeModal();
        return;
      }

      const closeButton = event.target.closest("[data-close-modal]");
      if (closeButton) {
        closeModal();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.openModal) {
        closeModal();
      }
    });

    window.addEventListener("resize", updateInventoryScrollState);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerdown", handlePointerMove);
  }

  function handlePointerMove(event) {
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.hasPointer = true;
    updateItemCursorPosition();
  }

  function renderItemsPanel() {
    const isExpanded = !state.itemsCollapsed;
    toggleItems.setAttribute("aria-expanded", String(isExpanded));
    inventoryPanel.classList.toggle("sidebar__panel--collapsed", state.itemsCollapsed);
    itemsToggleIcon.textContent = isExpanded ? "-" : "+";
    updateInventoryScrollState();
  }

  function renderHints() {
    const hintView = hintSystem.getViewModel();
    hintTextEl.textContent = hintView.text;
    hintCardEl.classList.toggle("hint-card--locked", !hintView.isResolved);
    hintCardEl.classList.toggle("hint-card--revealed", hintView.isResolved);
    hintTextEl.classList.toggle("modal__copy--locked", !hintView.isResolved);
    hintReveal.disabled = hintView.revealDisabled;
    hintIndex.textContent = hintView.counterText;
    hintPrev.disabled = hintView.prevDisabled;
    hintNext.disabled = hintView.nextDisabled;
  }

  function openModal(name) {
    isClosingModal = false;
    modalMotionToken += 1;
    state.openModal = name;
    modalOverlay.classList.remove("hidden");
    modalOverlay.setAttribute("aria-hidden", "false");
    hintModal.classList.toggle("hidden", name !== "hint");
    exitsModal.classList.toggle("hidden", name !== "exits");

    if (name === "hint") {
      hintSystem.setActiveHintIndex();
      renderHints();
    }

    playModalOpen(getModalByName(name));
  }

  async function closeModal() {
    if (!state.openModal || isClosingModal) return;

    const activeModal = getModalByName(state.openModal);
    const closeToken = modalMotionToken + 1;
    modalMotionToken = closeToken;
    state.openModal = null;
    isClosingModal = true;

    try {
        await playModalClose(activeModal);
    } finally {
        if (closeToken === modalMotionToken) {
            hideModals();
        }
        isClosingModal = false;
    }
  }

  function closeModalImmediately() {
    modalMotionToken += 1;
    hideModals();
    isClosingModal = false;
  }

  function hideModals() {
    state.openModal = null;
    modalOverlay.classList.add("hidden");
    modalOverlay.setAttribute("aria-hidden", "true");
    hintModal.classList.add("hidden");
    exitsModal.classList.add("hidden");
  }

  function getModalByName(name) {
    return name === "hint" ? hintModal : exitsModal;
  }

  function playModalOpen(modal) {
    if (!modal) return;

    runMotion(modalOverlay, { opacity: [0, 1] }, { duration: 0.16, easing: "ease-out" });
    runMotion(modal, {
        opacity: [0, 1],
        scale: [0.96, 1],
        y: [18, 0]
    }, { duration: 0.2, easing: "ease-out" });
  }

  function playModalClose(modal) {
    if (!modal) return Promise.resolve();

    return Promise.all([
        waitForAnimation(modalOverlay, { opacity: [1, 0] }, { duration: 0.12, easing: "ease-in" }),
        waitForAnimation(modal, {
            opacity: [1, 0],
            scale: [1, 0.97],
            y: [0, 12]
        }, { duration: 0.14, easing: "ease-in" })
    ]);
  }

  function waitForAnimation(element, keyframes, options) {
    const controls = runMotion(element, keyframes, options);

    if (controls && controls.finished) {
        return controls.finished;
    }

    return new Promise(resolve => {
        window.setTimeout(resolve, (options.duration || 0) * 1000);
    });
  }

  function bindMotion() {
    if (motionBound) return;

    motionBound = true;
    document.addEventListener("pointerenter", handleMotionEnter, true);
    document.addEventListener("pointerleave", handleMotionLeave, true);
    document.addEventListener("pointerdown", handleMotionPress);
    document.addEventListener("pointerup", handleMotionRelease);
    document.addEventListener("pointercancel", handleMotionLeave, true);
    document.addEventListener("focusin", handleMotionEnter);
    document.addEventListener("focusout", handleMotionLeave);
  }

  function getMotionButton(event) {
    const target = event.target.closest?.(motionButtonSelector);

    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") {
        return null;
    }

    return target;
  }

  function handleMotionEnter(event) {
    const button = getMotionButton(event);
    if (!button) return;

    animateButton(button, { scale: 1.03, y: -1 });
  }

  function handleMotionLeave(event) {
    const button = getMotionButton(event);
    if (!button) return;

    animateButton(button, { scale: 1, y: 0 });
  }

  function handleMotionPress(event) {
    const button = getMotionButton(event);
    if (!button) return;

    animateButton(button, { scale: 0.96, y: 1 });
  }

  function handleMotionRelease(event) {
    const button = getMotionButton(event);
    if (!button) return;

    animateButton(button, button.matches(":hover, :focus-visible") ? { scale: 1.03, y: -1 } : { scale: 1, y: 0 });
  }

  function animateButton(button, keyframes) {
    runMotion(button, keyframes, { duration: 0.12, easing: "ease-out" });
  }

  function renderItemCursor() {
    if (!itemCursorEl) return;

    const heldItem = world.selectedInventoryItem;

    if (!heldItem) {
        hideItemCursor();
        return;
    }

    itemCursorEl.textContent = heldItem.name;
    updateItemCursorPosition();
    showItemCursor();
  }

  function showItemCursor() {
    if (state.itemCursorVisible) return;

    state.itemCursorVisible = true;
    cursorMotionToken += 1;
    itemCursorEl.classList.remove("hidden");
    runMotion(itemCursorEl, { opacity: [0, 1] }, { duration: 0.12, easing: "ease-out" });
  }

  async function hideItemCursor() {
    if (!state.itemCursorVisible) return;

    const hideToken = cursorMotionToken + 1;
    cursorMotionToken = hideToken;
    state.itemCursorVisible = false;
    await waitForAnimation(itemCursorEl, { opacity: [1, 0] }, { duration: 0.1, easing: "ease-in" });

    if (hideToken === cursorMotionToken) {
        itemCursorEl.classList.add("hidden");
    }
  }

  function updateItemCursorPosition() {
    if (!itemCursorEl || !state.hasPointer) return;

    itemCursorEl.style.transform = `translate3d(${state.pointerX + 18}px, ${state.pointerY + 18}px, 0)`;
  }

  function runMotion(element, keyframes, options) {
    const motionAnimate = globalThis.Motion?.animate || globalThis.Motion?.animateMini;

    if (motionAnimate) {
        return motionAnimate(element, keyframes, options);
    }

    const animation = element.animate(normalizeWebKeyframes(keyframes), {
        duration: (options.duration || 0) * 1000,
        easing: options.easing || "ease",
        fill: "forwards"
    });

    return { finished: animation.finished };
  }

  function normalizeWebKeyframes(keyframes) {
    if (Array.isArray(keyframes)) return keyframes;

    const frameCount = Object.values(keyframes).reduce((count, value) => {
        return Math.max(count, Array.isArray(value) ? value.length : 1);
    }, 1);

    return Array.from({ length: frameCount }, (_, index) => {
        const frame = {};
        let y = 0;
        let scale = 1;

        Object.entries(keyframes).forEach(([property, value]) => {
            const frameValue = Array.isArray(value) ? value[Math.min(index, value.length - 1)] : value;

            if (property === "y") {
                y = frameValue;
                return;
            }

            if (property === "scale") {
                scale = frameValue;
                return;
            }

            frame[property] = frameValue;
        });

        if ("y" in keyframes || "scale" in keyframes) {
            frame.transform = `translateY(${y}px) scale(${scale})`;
        }

        return frame;
    });
  }


  function renderRoom(room) {
    roomNameEl.textContent = room.name;
    roomDescEl.innerHTML = "";

    const text = room.description;

    // match [label:id] OR [id]
    const regex = /\[(.*?)\]/g;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0];
        const content = match[1];

        // add text before match
        roomDescEl.append(
            document.createTextNode(text.slice(lastIndex, match.index))
        );

        let label, id;

        if (content.includes(":")) {
            [label, id] = content.split(":");
        } else {
            label = content;
            id = content;
        }

        const obj = world.objects[id];

        if (obj) {
            const btn = document.createElement("button");
            btn.className = "description-link";
            btn.textContent = label;
            btn.dataset.item = obj.id;

            roomDescEl.append(btn);
        } else {
            // fallback if object missing
            roomDescEl.append(document.createTextNode(label));
        }

        lastIndex = match.index + fullMatch.length;
    }

    // remaining text
    roomDescEl.append(
        document.createTextNode(text.slice(lastIndex))
    );

    renderRemainingContents(room);
}


  function renderRemainingContents(room) {
    const describedIds = [...room.description.matchAll(/\[(.*?)\]/g)]
        .map(match => {
            const content = match[1];
            return content.includes(":") ? content.split(":")[1] : content;
        });

    const remaining = room.getContents().filter(
        obj => !describedIds.includes(obj.id)
    );

    if (remaining.length === 0) return;

    roomDescEl.append(document.createElement("br"));
    roomDescEl.append(document.createTextNode(viewMessages.viewAlsoSee));

    remaining.forEach((obj, i) => {
        const btn = document.createElement("button");
        btn.className = "description-link";
        btn.textContent = obj.name;
        btn.dataset.item = obj.id;

        roomDescEl.append(btn);

        if (i < remaining.length - 1) {
            roomDescEl.append(document.createTextNode(", "));
        }
    });
}

  function renderInventory() {
    inventoryEl.innerHTML = "";

    const groups = groupInventoryItems(world.player.getContents());

    groups.forEach(group => {
        const section = document.createElement("section");
        section.className = "inventory-group";

        const heading = document.createElement("h3");
        heading.className = "inventory-group__title";
        heading.textContent = group.name;
        section.append(heading);

        group.items.forEach(obj => {
            const btn = document.createElement("button");
            btn.className = "sidebar__item"
            btn.type = "button"

            const itemName = document.createElement("span");
            itemName.className = "sidebar__item-name";
            itemName.textContent = obj.name;
            btn.append(itemName);

            const originName = getInventoryOriginName(obj);
            if (originName) {
                const itemOrigin = document.createElement("span");
                itemOrigin.className = "sidebar__item-origin";
                itemOrigin.textContent = formatText(viewMessages.viewInventoryOrigin, { origin: originName });
                btn.append(itemOrigin);
            }

            btn.setAttribute(
                "aria-label",
                formatText(originName ? viewMessages.viewInventoryItemWithOriginLabel : viewMessages.viewInventoryItemLabel, {
                    name: obj.name,
                    origin: originName
                })
            );

            if (world.selectedItem === obj) {
                btn.classList.add("is-active")
            }
            btn.dataset.item = obj.id;

            section.append(btn)
        });

        inventoryEl.append(section);
    });

    updateInventoryScrollState();
  }

  function updateInventoryScrollState() {
    requestAnimationFrame(() => {
        const hasOverflow = !state.itemsCollapsed && inventoryEl.scrollHeight > inventoryEl.clientHeight + 1;
        inventoryEl.classList.toggle("sidebar__list--scrollable", hasOverflow);
    });
  }

  function groupInventoryItems(items) {
    const groups = new Map();

    items.forEach(item => {
        const groupName = getInventoryRoomName(item) || viewMessages.viewUnknown;

        if (!groups.has(groupName)) {
            groups.set(groupName, {
                name: groupName,
                items: []
            });
        }

        groups.get(groupName).items.push(item);
    });

    return [...groups.values()];
  }

  function getInventoryRoomName(item) {
    let source = item.acquiredFrom;

    while (source && source.id !== "player") {
        if (world.rooms[source.id]) {
            return source.name;
        }

        source = source.location;
    }

    return "";
  }

  function getInventoryOriginName(item) {
    const source = item.acquiredFrom;

    if (!source || world.rooms[source.id]) {
        return "";
    }

    return source.name;
  }

  function renderActions() {
    actionBarEl.innerHTML = "";

    if (!world.selectedItem) return;

    const actions = world.selectedItem.getActions(world);

    actions.forEach(action => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "button action-button";
        btn.textContent = action.name;
        btn.dataset.action = action.name;

        actionBarEl.append(btn)
    })

  }

  function renderMessage() {
    messageEl.textContent = world.message;
  }

  function renderExits(room) {
    exitsMapEl.innerHTML = "";
    Object.entries(room.exits).forEach(([dir, targetRoom]) => {
        const btn = document.createElement("button")
        btn.className = "exit-node";
        btn.dataset.exit = dir;
        btn.dataset.slot = dir;
        btn.textContent = formatText(viewMessages.viewExitLabel, {
            direction: dir.toUpperCase(),
            room: targetRoom?.name || viewMessages.viewUnknown
        });

        exitsMapEl.append(btn);
    })
    Object.entries(room.lockedExits).forEach(([dir, targetRoom]) => {
        const btn = document.createElement("button")
        btn.className = "exit-node";
        btn.dataset.exit = dir;
        btn.dataset.slot = dir;
        btn.textContent = formatText(viewMessages.viewExitLabel, {
            direction: dir.toUpperCase(),
            room: targetRoom?.name || viewMessages.viewUnknown
        });
        btn.disabled = true;

        exitsMapEl.append(btn);
    })
  }
  
  export function closeActiveModal() {
    closeModalImmediately();
}
