"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Dataset {
    constructor() {
        this.objectList = [];
        this.id = "";
        this.kind = null;
        this.numRows = 0;
    }
    addObjects(sections) {
        this.objectList = this.objectList.concat(sections);
        this.numRows = this.objectList.length;
    }
    getObjects() {
        return this.objectList;
    }
    getId() {
        return this.id;
    }
    setId(id) {
        this.id = id;
    }
    getKind() {
        return this.kind;
    }
    setKind(kind) {
        this.kind = kind;
    }
    getNumRows() {
        return this.numRows;
    }
}
exports.default = Dataset;
//# sourceMappingURL=Dataset.js.map