import { world, setWorldMessages } from "./model.js";
import { initView, render, closeActiveModal, setHintDefinitions, setViewMessages } from "./view.js";
import { formatText } from "./TextTemplate.js";
import Player from "./Player.js";
import Item from "./Item.js";
import Container from "./Container.js";
import Gatherer from "./Gatherer.js";
import Interactable from "./Interactable.js";
import Knob from "./Knob.js";
import Room from "./Room.js";
import Door from "./Door.js";

let els;

export async function init() {
    els = initView();

    const resp = await fetch('./db.json')
    const data = await resp.json();
    setWorldMessages(data.messages);
    setViewMessages(data.messages);
    setHintDefinitions(data.hints, data.hintConditions);

    createItems(data);
    createGatherers(data);
    createContainers(data);
    createInteractables(data);
    createDoors(data);
    createRooms(data);

    linkWorld();

    world.currentRoom = world.rooms["room"];
    world.player = new Player(data.player);
    world.selectedItem = null;

    render();
    bindUI();

}

function createItems(data) {
    Object.values(data.items).forEach(itemData => {
        world.objects[itemData.id] = new Item({
            ...itemData,
            messages: {
                take: data.messages?.itemTake,
                drop: data.messages?.itemDrop,
                actionDrop: data.messages?.itemActionDrop,
                actionUse: data.messages?.itemActionUse,
                actionTake: data.messages?.itemActionTake
            }
        });
    })
}

function createGatherers(data) {
    Object.values(data.gatherers).forEach(gathererData => {
        world.objects[gathererData.id] = new Gatherer({
            ...gathererData,
            messages: {
                invalidInteraction: data.messages?.gathererInvalidInteraction
            }
        });
    })
}

function createContainers(data) {
    Object.values(data.containers).forEach(data => {
        world.objects[data.id] = new Container(data);
    })
}

function createInteractables(data) {
    Object.values(data.interactables).forEach(interactableData => {
        const hydratedData = {
            ...interactableData,
            messages: {
                defaultAction: data.messages?.interactableDefaultAction
            }
        };

        if (interactableData.sides) {
            world.objects[interactableData.id] = new Knob(hydratedData);
        } else {
            world.objects[interactableData.id] = new Interactable(hydratedData);
        }
    })
}

function createDoors(data) {
    Object.values(data.doors).forEach(data => {
        world.objects[data.id] = new Door(data);
    })
}

function createRooms(data) {
    Object.values(data.rooms).forEach(data => {
        world.rooms[data.id] = new Room(data);
    })
}

function linkWorld() {
    Object.values(world.objects).forEach(obj => {
        if (typeof obj.location === "string") {
            obj.location = world.objects[obj.location] || world.rooms[obj.location];
        }
    });

    Object.values(world.objects).forEach(obj => {
        if (obj.contents) {
            obj.contents = obj.contents.map(id => world.objects[id]);
        }
    });

    Object.values(world.rooms).forEach(room => {
        if (room.contents) {
            room.contents = room.contents.map(id => world.objects[id]);
        }
    });

    Object.values(world.rooms).forEach(room => {
        for (const dir in room.exits) {
            const target = room.exits[dir];
            if (target === "unknown") continue;
            room.exits[dir] = world.rooms[room.exits[dir]];
        }
        for (const dir in room.lockedExits) {
            const target = room.exits[dir];
            if (target === "unknown") continue;
            room.lockedExits[dir] = world.rooms[room.lockedExits[dir]];
        }
    })
}


export function selectObject(obj) {
    world.selectedItem = obj;
    render();
}

export function runAction(action) {
    action.handler(world);
    world.selectedItem = null;
    render();
}

function bindUI() {
    document.addEventListener("click", handleClick);
}

function handleClick(e) {
    const exitBtn = e.target.closest("[data-exit]");
    if (exitBtn) return handleExit(exitBtn.dataset.exit)

    const itemBtn = e.target.closest("[data-item]");
    if (itemBtn) return handleItem(itemBtn.dataset.item)

    const actionBtn = e.target.closest("[data-action]");
    if (actionBtn) return handleAction(actionBtn.dataset.action)

    //const inventoryBtn = e.target.closest("[data-inventory]");
    //if (inventoryBtn) return handleInventory(inventoryBtn.dataset.item)
}

function handleExit(dir) {
    const room = world.currentRoom;
    let dest = room.getExit(dir);
    if (dest === "unknown") {
        dest = resolveUnknownExit(room, dir);
    }
    if (!dest) return;

    world.currentRoom = dest;
    world.selectedItem = null;
    world.selectedInventoryItem = null;
    world.message = formatText(world.messages.controllerMove, {
        direction: dir,
        destination: dest.name
    });

    closeActiveModal();

    render();
}

function handleItem(itemId) {
    const item = world.objects[itemId]
    if (!world.selectedInventoryItem) {
        world.selectedItem = item
        world.message = item.description
        render();
        return;
    }
    else {
        item.interact(world.selectedInventoryItem, world);
        world.selectedInventoryItem = null;
        world.selectedItem = null;
        render();
    }
}

function handleAction(actionId) {
    const item = world.selectedItem;
    if (!item) return;
    const actions = item.getActions(world)
    const action = actions.find(a => a.name === actionId);

    if (!action) return;

    action.handler(world);

    render();
}

function resolveUnknownExit(room, dir) {
    if (room.id !== "room") return;
    const knob = world.objects["knob"];

    switch (knob.selectedSide) {
            case "castle": return world.rooms["great-hall"];
            case "wooden-shack": return world.rooms["interior"];
            case "village-square": return world.rooms["square"];
        }

}
