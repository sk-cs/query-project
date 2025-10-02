"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
const QueryValidationBody_1 = require("./QueryValidationBody");
const orderDirection = ["UP", "DOWN"];
const numericalApplyToken = ["MAX", "MIN", "AVG", "SUM"];
const numericalAndStringApplyToken = ["COUNT"];
let applyKeys = [];
let groupKeys = [];
let transformationExist = false;
exports.validateTransformations = (query) => {
    applyKeys = [];
    groupKeys = [];
    for (let key of Object.keys(query)) {
        if (key !== "GROUP" && key !== "APPLY") {
            throw new IInsightFacade_1.InsightError("TRANSFORMATIONS shouldn't have other object then GROUP and APPLY");
        }
    }
    if (query.GROUP !== undefined && query.APPLY !== undefined) {
        try {
            validateGroup(query.GROUP);
            validateApply(query.APPLY);
        }
        catch (error) {
            throw error;
        }
    }
    else {
        throw new IInsightFacade_1.InsightError("GROUP or APPLY are undefined in TRANSFORMATIONS");
    }
};
const validateApply = (query) => {
    for (let applyRule of Object.values(query)) {
        if (Object.keys(applyRule).length !== 1) {
            throw new IInsightFacade_1.InsightError("Each APPLYRULE should have only one APPLYKEY");
        }
        for (let key of Object.keys(applyRule)) {
            if (key.includes("_")) {
                throw new IInsightFacade_1.InsightError("APPLYKEY contains underscore");
            }
            if (applyKeys.includes(key)) {
                throw new IInsightFacade_1.InsightError("APPLYKEY shouldn't be reused");
            }
            applyKeys.push(key);
        }
        if (Object.values(applyRule).length !== 1) {
            throw new IInsightFacade_1.InsightError("Each APPLYRULE should have only one APPLYTOKEN and target key pair");
        }
        for (let applyRuleValue of Object.values(applyRule)) {
            try {
                if (applyRuleValue !== undefined) {
                    validateApplyTokenAndKey(applyRuleValue);
                }
                else {
                    throw new IInsightFacade_1.InsightError("APPLYRULE value must exist");
                }
            }
            catch (error) {
                throw error;
            }
        }
    }
};
const validateApplyTokenAndKey = (query) => {
    if (Object.keys(query).length !== 1) {
        throw new IInsightFacade_1.InsightError("APPLYRULE body should have only one key");
    }
    let keys = Object.keys(query);
    let values = Object.values(query);
    if (keys.length !== 1 || values.length !== 1) {
        throw new IInsightFacade_1.InsightError("APPLYRULE must have target key");
    }
    for (let i in keys) {
        if (typeof values[i] !== "string") {
            throw new IInsightFacade_1.InsightError("APPLYRULE target key must be string type");
        }
        if (!numericalApplyToken.includes(keys[i]) && !numericalAndStringApplyToken.includes(keys[i])) {
            throw new IInsightFacade_1.InsightError("APPLYTOKEN is not valid");
        }
        try {
            if (numericalApplyToken.includes(keys[i])) {
                QueryValidationBody_1.validateKey(values[i], QueryValidationBody_1.keyFieldKind.mfield);
            }
            else {
                QueryValidationBody_1.validateKey(values[i]);
            }
        }
        catch (error) {
            throw error;
        }
    }
};
const validateGroup = (query) => {
    if (Object.values(query).length < 1) {
        throw new IInsightFacade_1.InsightError("GROUP should have at least one key");
    }
    for (let val of Object.values(query)) {
        try {
            if (typeof val === "string") {
                QueryValidationBody_1.validateKey(val);
                groupKeys.push(val);
            }
            else {
                throw new IInsightFacade_1.InsightError("GROUP target keys are not string");
            }
        }
        catch (error) {
            throw error;
        }
    }
};
exports.validateOptions = (query, isTransformation) => {
    transformationExist = isTransformation;
    for (let key of Object.keys(query)) {
        if (key !== "COLUMNS" && key !== "ORDER") {
            throw new IInsightFacade_1.InsightError("WHERE should have COLUMNS, optionally ORDER and not else");
        }
    }
    if (query.COLUMNS !== undefined) {
        try {
            validateColumns(query.COLUMNS);
            if (query.ORDER !== undefined) {
                validateOrder(query);
            }
        }
        catch (error) {
            throw error;
        }
    }
    else {
        throw new IInsightFacade_1.InsightError("OPTIONS must have COLUMNS");
    }
};
const validateColumns = (query) => {
    if (Object.values(query).length < 1) {
        throw new IInsightFacade_1.InsightError("COLUMNS should have at least one key");
    }
    for (let val of Object.values(query)) {
        if (typeof val !== "string") {
            throw new IInsightFacade_1.InsightError("COLUMNS has not string key");
        }
        try {
            if (!transformationExist) {
                QueryValidationBody_1.validateKey(val);
            }
            else if (!applyKeys.includes(val) && !groupKeys.includes(val)) {
                throw new IInsightFacade_1.InsightError("COLUMNS keys are invalid");
            }
        }
        catch (error) {
            throw error;
        }
    }
};
const validateOrder = (query) => {
    if (Array.isArray(query.ORDER)) {
        throw new IInsightFacade_1.InsightError("ORDER should have exactly one key or object");
    }
    if (typeof query.ORDER === "string") {
        if (!Object.values(query.COLUMNS).includes(query.ORDER.toString())) {
            throw new IInsightFacade_1.InsightError("ORDER key should be in COLUMNS");
        }
    }
    else if (typeof query.ORDER === "object") {
        for (let key of Object.keys(query.ORDER)) {
            if (key !== "dir" && key !== "keys") {
                throw new IInsightFacade_1.InsightError("Order should only have dir or keys");
            }
        }
        if (query.ORDER.dir !== undefined) {
            validateOrderDir(query.ORDER.dir);
        }
        else {
            throw new IInsightFacade_1.InsightError("Order object must have dir");
        }
        if (query.ORDER.keys !== undefined) {
            validateOrderKeys(query);
        }
        else {
            throw new IInsightFacade_1.InsightError("Order object must have keys");
        }
    }
    else {
        throw new IInsightFacade_1.InsightError("Order value type is invalid should be object or string");
    }
};
const validateOrderDir = (query) => {
    if (Array.isArray(query)) {
        throw new IInsightFacade_1.InsightError("ORDER dir value should not be array");
    }
    if (!orderDirection.includes(query)) {
        throw new IInsightFacade_1.InsightError("ORDER DIRECTION should be one of UP or DOWN");
    }
};
const validateOrderKeys = (query) => {
    if (!Array.isArray(query.ORDER.keys) || query.ORDER.keys.length === 0) {
        throw new IInsightFacade_1.InsightError("ORDER keys value should be array type");
    }
    for (let val of Object.values(query.ORDER.keys)) {
        if (!Object.values(query.COLUMNS).includes(val)) {
            throw new IInsightFacade_1.InsightError("ORDER key should be in COLUMNS");
        }
    }
};
//# sourceMappingURL=QueryValidationTransAndOptions.js.map