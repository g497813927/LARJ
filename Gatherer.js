import Container from "./Container.js"

class Gatherer extends Container {
    constructor(data) {
        super(data);
        this.action = data.action || {};
        this.conditions = data.conditions || {};
        this.interactions = data.interact || {};
        this.hiddenContents = data.hiddenContents || [];
        this.messages = {
            invalidInteraction: data.messages?.invalidInteraction
        };
    }

    interact(item, world) {
        if (this.interactions[item.id]) {
            this.contents.push(item);
            world.player.removeChild(item);
            item.setLocation(this)
            world.message = this.interactions[item.id];
            world.selectedItem = null;
            world.selectedInventoryItem = null;
            const condition = this.checkConditions(world);
            if (condition) {
                this.applyCondition(condition, world);
            }
        }
        else {
            world.message = this.messages.invalidInteraction;
        }
    }

    checkConditions(world) {
        for (const key in this.conditions) {
            const condition = this.conditions[key];

            const contentIds = this.contents.map(item => item.id);

            const hasAllRequired = condition.contains.every(id =>
                contentIds.includes(id)
            );
      
            const hasNoExtras = contentIds.every(id =>
                condition.contains.includes(id)
            );

            if (hasAllRequired && hasNoExtras) {
                return condition;
            }
        }
        return null;
    }

    getActions(world) {
        this.checkConditions();
        const actions = super.getActions(world);
        return actions;
    }

    canAdd() {
        return true;
    }

    applyCondition(condition, world) {
        if (condition.newDescription) {
            this.setDescription(condition.newDescription);
        }
        if (condition.reveal) {
            condition.reveal.forEach(id => {
                const obj = world.objects[id];
                this.addChild(obj);
                this.hiddenContents = this.hiddenContents.filter(hiddenId => hiddenId !== id);
            })
        }
        if (condition.hide) {
            condition.hide.forEach(id => {
                const obj = world.objects[id];
                this.hiddenContents.push(id)
                this.removeChild(obj);
            })
        }
        if (condition.newAction) {
            this.action = condition.newAction;
            this.opened = false;
        }
        if (!condition.newAction) {
            this.opened = true;
        }
        if (condition.unlockExit) {
            const room = world.rooms[world.currentRoomId];
            room.unlockExit(condition.unlockExit);
        }
    }

}

export default Gatherer
