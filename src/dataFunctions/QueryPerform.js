"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
const QueryValidationBody_1 = require("./QueryValidationBody");
const QueryPerformTransAndOptions_1 = require("./QueryPerformTransAndOptions");
const McomparisonType = { LT: "LT", GT: "GT", EQ: "EQ" };
let currentId = "";
let searchingDataset = [];
exports.handleQueryCourse = (query, accessDatasets) => {
    try {
        currentId = QueryValidationBody_1.validateQuery(query, accessDatasets);
    }
    catch (error) {
        throw error;
    }
    searchingDataset = accessDatasets.getDatasetsOfId(currentId);
    if (searchingDataset.length === 0) {
        throw new IInsightFacade_1.InsightError("dataset is empty");
    }
    let resultOfQuery = null;
    let transformationExist = false;
    if (query.TRANSFORMATIONS !== undefined) {
        transformationExist = true;
    }
    if (Object.values(query.WHERE).length === 0) {
        if (searchingDataset.length > 5000) {
            throw new IInsightFacade_1.ResultTooLargeError("result is too large");
        }
    }
    else {
        try {
            resultOfQuery = handleWhere(query.WHERE, searchingDataset, transformationExist);
        }
        catch (error) {
            throw error;
        }
    }
    if (resultOfQuery !== null && resultOfQuery.length > 0) {
        try {
            if (transformationExist) {
                resultOfQuery = QueryPerformTransAndOptions_1.handleTransformations(query.TRANSFORMATIONS, resultOfQuery);
            }
            if (resultOfQuery.length > 5000) {
                throw new IInsightFacade_1.ResultTooLargeError();
            }
            resultOfQuery = QueryPerformTransAndOptions_1.handleOptions(query.OPTIONS, resultOfQuery);
        }
        catch (err) {
            throw err;
        }
    }
    return resultOfQuery;
};
function handleWhere(query, dataset, TransformationExist) {
    let result = [];
    for (let section of dataset) {
        if (!TransformationExist && result.length > 5000) {
            throw new IInsightFacade_1.ResultTooLargeError();
        }
        try {
            if (handleFilters(query, section)) {
                result.push(section);
            }
        }
        catch (error) {
            throw error;
        }
    }
    return result;
}
const handleFilters = (query, courseSection) => {
    try {
        if (query.NOT !== undefined) {
            return !handleFilters(query.NOT, courseSection);
        }
        else if (query.IS !== undefined) {
            return handleScomparisonIS(query.IS, courseSection);
        }
        else if (query.LT !== undefined) {
            return handleMcomparison(query.LT, courseSection, McomparisonType.LT);
        }
        else if (query.GT !== undefined) {
            return handleMcomparison(query.GT, courseSection, McomparisonType.GT);
        }
        else if (query.EQ !== undefined) {
            return handleMcomparison(query.EQ, courseSection, McomparisonType.EQ);
        }
        else if (query.AND !== undefined) {
            return handleLogicComparisonAND(query.AND, courseSection);
        }
        else if (query.OR !== undefined) {
            return handleLogicComparisonOR(query.OR, courseSection);
        }
        else {
            throw new IInsightFacade_1.InsightError();
        }
    }
    catch (error) {
        throw error;
    }
};
const handleScomparisonIS = (query, courseSection) => {
    for (let key of Object.keys(query)) {
        let [id, field] = key.split("_", 2);
        let courseSectionSval = courseSection[field];
        let searchingVal = query[key];
        let temp = searchingVal.slice(0, 1);
        if (temp === "*") {
            searchingVal = searchingVal.slice(1);
        }
        temp = searchingVal.slice(-1);
        if (temp === "*") {
            searchingVal = searchingVal.slice(0, -1);
        }
        if (courseSectionSval.includes(searchingVal)) {
            return true;
        }
    }
    return false;
};
const handleLogicComparisonAND = (query, courseSection) => {
    for (let val of Object.values(query)) {
        try {
            if (!handleFilters(val, courseSection)) {
                return false;
            }
        }
        catch (error) {
            throw error;
        }
    }
    return true;
};
const handleLogicComparisonOR = (query, courseSection) => {
    for (let val of Object.values(query)) {
        try {
            if (handleFilters(val, courseSection)) {
                return true;
            }
        }
        catch (error) {
            throw error;
        }
    }
    return false;
};
const handleMcomparison = (query, courseSection, type) => {
    for (let key of Object.keys(query)) {
        let [id, field] = key.split("_", 2);
        let courseSectionMval = courseSection[field];
        let searchingVal = query[key];
        if (type === McomparisonType.EQ) {
            if (courseSectionMval === searchingVal) {
                return true;
            }
        }
        else if (type === McomparisonType.LT) {
            if (courseSectionMval < searchingVal) {
                return true;
            }
        }
        else if (type === McomparisonType.GT) {
            if (courseSectionMval > searchingVal) {
                return true;
            }
        }
    }
    return false;
};
//# sourceMappingURL=QueryPerform.js.map