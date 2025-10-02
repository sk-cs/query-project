"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
const QueryValidationTransAndOptions_1 = require("./QueryValidationTransAndOptions");
const courseKeyMField = ["avg", "pass", "fail", "audit", "year"];
const roomKeyMField = ["lat", "lon", "seats"];
const courseKeySField = ["dept", "id", "instructor", "title", "uuid"];
const roomKeySField = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
exports.keyFieldKind = { mfield: "mfield", sfield: "sfield" };
let datasetId = [];
let currentId = "";
let currentInsightFacade = null;
let currentDatasetKind = null;
exports.validateQuery = (query, insightFacade) => {
    currentInsightFacade = insightFacade;
    datasetId = insightFacade.getDatasetId();
    currentId = "";
    if (query === null) {
        throw new IInsightFacade_1.InsightError("The query is null.");
    }
    if (typeof query !== "object") {
        throw new IInsightFacade_1.InsightError("The query is not a JSON.");
    }
    for (let key of Object.keys(query)) {
        if (key !== "WHERE" && key !== "OPTIONS" && key !== "TRANSFORMATIONS") {
            throw new IInsightFacade_1.InsightError("The Query has invalid object.");
        }
    }
    if (query.WHERE !== undefined) {
        if (Object.values(query.WHERE).length > 0) {
            try {
                validateWhere(query.WHERE);
            }
            catch (error) {
                throw error;
            }
        }
    }
    else {
        throw new IInsightFacade_1.InsightError("The query dose not have WHERE.");
    }
    let transformationExist = false;
    if (query.TRANSFORMATIONS !== undefined) {
        transformationExist = true;
        try {
            QueryValidationTransAndOptions_1.validateTransformations(query.TRANSFORMATIONS);
        }
        catch (error) {
            throw error;
        }
    }
    if (query.OPTIONS !== undefined) {
        try {
            QueryValidationTransAndOptions_1.validateOptions(query.OPTIONS, transformationExist);
        }
        catch (error) {
            throw error;
        }
    }
    else {
        throw new IInsightFacade_1.InsightError("The query does not have OPTIONS.");
    }
    return currentId;
};
const validateFilter = (query) => {
    if (Object.values(query).length > 1) {
        throw new IInsightFacade_1.InsightError("Each FILTER object should only have 1 key");
    }
    try {
        if (query.NOT !== undefined) {
            return validateNegation(query.NOT);
        }
        else if (query.IS !== undefined) {
            return validateScomparison(query.IS);
        }
        else if (query.LT !== undefined) {
            return validateMcomparison(query.LT);
        }
        else if (query.GT !== undefined) {
            return validateMcomparison(query.GT);
        }
        else if (query.EQ !== undefined) {
            return validateMcomparison(query.EQ);
        }
        else if (query.AND !== undefined) {
            return validateLogicComparison(query.AND);
        }
        else if (query.OR !== undefined) {
            return validateLogicComparison(query.OR);
        }
        else {
            throw new IInsightFacade_1.InsightError("It is invalid FILTER");
        }
    }
    catch (error) {
        throw error;
    }
};
const validateWhere = (query) => {
    if (Object.values(query).length > 1) {
        throw new IInsightFacade_1.InsightError("WHERE should have only 1 FILTER");
    }
    return validateFilter(query);
};
const validateLogicComparison = (query) => {
    if (Object.values(query).length < 1) {
        throw new IInsightFacade_1.InsightError("LOGIC should have at least 1 FILTER");
    }
    let result;
    for (let val of Object.values(query)) {
        try {
            result = validateFilter(val);
        }
        catch (error) {
            throw error;
        }
    }
    return result;
};
const validateNegation = (query) => {
    if (Object.values(query).length !== 1) {
        throw new IInsightFacade_1.InsightError("NOT should have exactly one 1 FILTER");
    }
    try {
        return validateFilter(query);
    }
    catch (error) {
        throw error;
    }
};
exports.validateKey = (queryKey, fieldKind = null) => {
    let splittedKey = { id: "", field: "" };
    const splitted = queryKey.split("_", 2);
    if (splitted.length !== 2) {
        throw new IInsightFacade_1.InsightError("key is invalid");
    }
    [splittedKey.id, splittedKey.field] = splitted;
    if (currentId === "") {
        if (!datasetId.includes(splittedKey.id)) {
            throw new IInsightFacade_1.InsightError("key idstring does not match with any id of added datasets");
        }
        else {
            currentId = splittedKey.id;
            currentDatasetKind = currentInsightFacade.getDatasetsKind(currentId);
        }
    }
    else {
        if (currentId !== splittedKey.id) {
            throw new IInsightFacade_1.InsightError("key idstring does not match with other key");
        }
    }
    let keyMField = [];
    let keySField = [];
    if (currentDatasetKind === IInsightFacade_1.InsightDatasetKind.Rooms) {
        keyMField = roomKeyMField;
        keySField = roomKeySField;
    }
    else if (currentDatasetKind === IInsightFacade_1.InsightDatasetKind.Courses) {
        keyMField = courseKeyMField;
        keySField = courseKeySField;
    }
    else {
        throw new IInsightFacade_1.InsightError("Data type of the dataset is invalid");
    }
    if (fieldKind === exports.keyFieldKind.sfield || fieldKind === null) {
        for (let s of keySField) {
            if (splittedKey.field === s) {
                return;
            }
        }
    }
    if (fieldKind === exports.keyFieldKind.mfield || fieldKind === null) {
        for (let s of keyMField) {
            if (splittedKey.field === s) {
                return;
            }
        }
    }
    throw new IInsightFacade_1.InsightError("key field is invalid");
};
const validateMcomparison = (query) => {
    if (Object.values(query).length !== 1) {
        throw new IInsightFacade_1.InsightError("There should be only one key in MCOMPARISON");
    }
    for (let key of Object.keys(query)) {
        try {
            exports.validateKey(key, exports.keyFieldKind.mfield);
        }
        catch (error) {
            throw error;
        }
    }
    for (let val of Object.values(query)) {
        if (typeof val !== "number") {
            throw new IInsightFacade_1.InsightError("MCOMPARISON value should be number");
        }
    }
    return true;
};
const validateScomparison = (query) => {
    if (Object.values(query).length !== 1) {
        throw new IInsightFacade_1.InsightError("There should be only one key in SCOMPARISON");
    }
    for (let key of Object.keys(query)) {
        try {
            exports.validateKey(key, exports.keyFieldKind.sfield);
        }
        catch (error) {
            throw error;
        }
    }
    for (let val of Object.values(query)) {
        if (typeof val !== "string") {
            throw new IInsightFacade_1.InsightError("SCOMPARISON value should a string");
        }
        else if (val.length > 2) {
            let temp = val.slice(1);
            temp = temp.slice(0, -1);
            if (temp.includes("*")) {
                throw new IInsightFacade_1.InsightError("SCOMPARISON value, inputstring should not contain *");
            }
        }
    }
    return true;
};
//# sourceMappingURL=QueryValidationBody.js.map