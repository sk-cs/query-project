"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
const applyToken = { MAX: "MAX", MIN: "MIN", AVG: "AVG", COUNT: "COUNT" };
const orderDirection = { UP: "UP", DOWN: "DOWN" };
exports.handleTransformations = (query, dataset) => {
    let result = [];
    try {
        result = handleGroup(query.GROUP, dataset);
    }
    catch (error) {
        throw new IInsightFacade_1.InsightError("handleGroup has error");
    }
    try {
        handleApply(query.APPLY, result);
    }
    catch (error) {
        throw error;
    }
    return result;
};
const handleGroup = (query, dataset) => {
    let queryCopy = [...query];
    let targetKey = queryCopy.shift();
    let groups = [];
    let keyValues = [];
    let [id, field] = targetKey.split("_", 2);
    for (let data of dataset) {
        if (!keyValues.includes(data[field])) {
            keyValues.push(data[field]);
            let group = [data];
            groups.push(group);
        }
        else {
            let index = keyValues.indexOf(data[field]);
            groups[index].push(data);
        }
    }
    let groupObjects = [];
    for (let i in keyValues) {
        let groupObject = {};
        groupObject[field] = keyValues[i];
        groupObject["data"] = groups[i];
        groupObjects.push(groupObject);
    }
    if (queryCopy.length === 0) {
        return groupObjects;
    }
    let resultGroupObjects = [];
    for (let groupObject of groupObjects) {
        if (Array.isArray(groupObject.data) && groupObject.data.length !== 0) {
            let groupedGroupObjects = handleGroup(queryCopy, groupObject.data);
            delete groupObject["data"];
            for (let object of groupedGroupObjects) {
                let newObject = Object.assign(Object.assign({}, groupObject), object);
                resultGroupObjects.push(newObject);
            }
        }
    }
    return resultGroupObjects;
};
const handleApply = (query, groupedDataset) => {
    try {
        for (let data of groupedDataset) {
            for (let applyRule of query) {
                let applyKey = Object.keys(applyRule);
                let applyTokenAndKey = Object.values(applyRule);
                for (let i in applyKey) {
                    data[applyKey[i]] = handleApplyToken(applyTokenAndKey[i], data["data"]);
                }
            }
        }
    }
    catch (error) {
        throw error;
    }
    for (let data of groupedDataset) {
        delete data["data"];
    }
};
const handleApplyToken = (query, groupedData) => {
    try {
        if (query.MAX !== undefined) {
            return handleMaxAndMin(query.MAX, groupedData, applyToken.MAX);
        }
        else if (query.MIN !== undefined) {
            return handleMaxAndMin(query.MIN, groupedData, applyToken.MIN);
        }
        else if (query.AVG !== undefined) {
            return Math.round((handleSum(query.AVG, groupedData) / groupedData.length) * 100) / 100;
        }
        else if (query.COUNT !== undefined) {
            return handleCount(query.COUNT, groupedData);
        }
        else if (query.SUM !== undefined) {
            return handleSum(query.SUM, groupedData);
        }
        else {
            throw new IInsightFacade_1.InsightError("APPLY Token has problem");
        }
    }
    catch (error) {
        throw error;
    }
};
const handleCount = (query, groupedData) => {
    let uniqueValues = [];
    let [id, field] = query.split("_", 2);
    for (let data of groupedData) {
        if (!uniqueValues.includes(data[field])) {
            uniqueValues.push(data[field]);
        }
    }
    return uniqueValues.length;
};
const handleMaxAndMin = (query, groupedData, type) => {
    let resultVal = null;
    let [id, field] = query.split("_", 2);
    if (type === applyToken.MIN) {
        for (let data of groupedData) {
            if (resultVal === null || data[field] < resultVal) {
                resultVal = data[field];
            }
        }
    }
    else if (type === applyToken.MAX) {
        for (let data of groupedData) {
            if (resultVal === null || data[field] > resultVal) {
                resultVal = data[field];
            }
        }
    }
    return resultVal;
};
const handleSum = (query, groupedData) => {
    let resultVal = 0;
    let [id, field] = query.split("_", 2);
    for (let data of groupedData) {
        resultVal = resultVal + data[field];
    }
    return resultVal;
};
exports.handleOptions = (query, dataset) => {
    let result = [];
    for (let data of dataset) {
        try {
            result.push(handleColumns(query.COLUMNS, data));
        }
        catch (error) {
            throw error;
        }
    }
    if (query.ORDER !== undefined) {
        try {
            if (typeof query.ORDER === "object") {
                handleOrderWithObject(query.ORDER.dir, query.ORDER.keys, result);
            }
            else {
                handleOrder(query.ORDER, result);
            }
        }
        catch (error) {
            throw error;
        }
    }
    return result;
};
const handleColumns = (query, data) => {
    let object = {};
    for (let val of Object.values(query)) {
        let key = "";
        if (val.toString().includes("_")) {
            let [id, field] = val.toString().split("_", 2);
            key = field;
        }
        else {
            key = val.toString();
        }
        object[val.toString()] = data[key];
    }
    if (Object.keys(object).length === 0) {
        throw new IInsightFacade_1.InsightError("error in handleColumns()");
    }
    return object;
};
const handleOrder = (query, dataset) => {
    dataset.sort((a, b) => {
        if (a[query] < b[query]) {
            return -1;
        }
        else if (a[query] > b[query]) {
            return 1;
        }
        return 0;
    });
};
const handleOrderWithObject = (dir, keys, dataset) => {
    if (keys.length === 0) {
        return;
    }
    let keysCopy = [...keys];
    let targetKey = keysCopy.shift();
    let tieValues = [];
    dataset.sort((a, b) => {
        if (a[targetKey] < b[targetKey]) {
            if (dir === orderDirection.UP) {
                return -1;
            }
            return 1;
        }
        else if (a[targetKey] > b[targetKey]) {
            if (dir === orderDirection.UP) {
                return 1;
            }
            return -1;
        }
        else {
            if (!tieValues.includes(a[targetKey])) {
                tieValues.push(a[targetKey]);
            }
            return 0;
        }
    });
    let tieIndexList = new Array(tieValues.length).fill([]).map(() => new Array());
    let tieDataList = new Array(tieValues.length).fill([]).map(() => new Array());
    for (let i in dataset) {
        if (tieValues.includes(dataset[i][targetKey])) {
            let index = tieValues.indexOf(dataset[i][targetKey]);
            tieIndexList[index].push(Number(i));
            tieDataList[index].push(Object.assign({}, dataset[i]));
        }
    }
    for (let i in tieIndexList) {
        handleOrderWithObject(dir, keysCopy, tieDataList[Number(i)]);
        for (let j in tieIndexList[Number(i)]) {
            dataset[tieIndexList[Number(i)][j]] = tieDataList[Number(i)][j];
        }
    }
};
//# sourceMappingURL=QueryPerformTransAndOptions.js.map