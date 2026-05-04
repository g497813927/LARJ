import GameObject from './GameObject.js'

class Door extends GameObject {
    constructor(data) {
        super(data);
        this.conditions = data.conditions || {};
        this.currentItems = [];
        this.key = data.interact || {};
    }

    interact(item, world) {
        if (!this.key[item.id]){
            world.message = "I don't think that item will work here.";
            return;
        }
        this.currentItems.push(item);
        world.player.removeChild(item);
        world.message = this.key[item.id]
        world.selectedItem = null;
        world.selectedInventoryItem = null;
        const condition = this.checkConditions();
        if (condition) {
            this.applyCondition(condition, world);
        } else {
            world.message = this.key[item.id];
        }
    }

    checkConditions() {
        for (const key in this.conditions) {
            const condition = this.conditions[key];
            if (condition.contains.every(id => this.currentItems.some(item => item.id === id))) {
                return condition;
            }
        }
        return null;
    }

    applyCondition(condition, world) {
        if (condition.newDescription) {
            this.setDescription(condition.newDescription);
        }
        if (condition.newAction) {
            this.key = condition.newAction;
        }
        if (condition.reveal) {
            condition.reveal.forEach(id => {
                const obj = world.objects[id];
                this.location.addChild(obj);
            })
        }  
        if (condition.unlockExit) {
            this.location.unlockExit(condition.unlockExit, world);
        }
    }
}

export default Door
