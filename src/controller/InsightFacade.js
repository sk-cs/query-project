"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const QueryPerform_1 = require("../dataFunctions/QueryPerform");
const DatasetDiskHelper_1 = require("../dataFunctions/DatasetDiskHelper");
const DatasetHelper_1 = require("../dataFunctions/DatasetHelper");
const Dataset_1 = require("../dataStructure/Dataset");
class InsightFacade {
    constructor() {
        Util_1.default.trace("InsightFacadeImpl::init()");
        this.datasetId = [];
        this.datasets = [];
        this.count = 0;
        DatasetDiskHelper_1.loadDatasetFromDisk(this.datasets, this.datasetId);
    }
    getDatasetsOfId(id) {
        for (let dataset of this.datasets) {
            if (dataset.getId() === id) {
                return dataset.getObjects();
            }
        }
        const emptyResult = [];
        return emptyResult;
    }
    getDatasetsKind(id) {
        for (let dataset of this.datasets) {
            if (dataset.getId() === id) {
                return dataset.getKind();
            }
        }
        return null;
    }
    getDatasetId() {
        return this.datasetId;
    }
    addDataset(id, content, kind) {
        if (id === null || content == null || id.includes("_")) {
            return Promise.reject(new IInsightFacade_1.InsightError("invalid id and content"));
        }
        if (this.datasetId.includes(id)) {
            return Promise.reject(new IInsightFacade_1.InsightError("id already exist"));
        }
        if (kind !== IInsightFacade_1.InsightDatasetKind.Courses && kind !== IInsightFacade_1.InsightDatasetKind.Rooms) {
            return Promise.reject(new IInsightFacade_1.InsightError("invalid kind"));
        }
        let newDataset = new Dataset_1.default();
        newDataset.setId(id);
        newDataset.setKind(kind);
        if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return DatasetHelper_1.unzipParseHtmlRoom(content, id, newDataset, this.datasets, this.datasetId);
        }
        else if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            return DatasetHelper_1.unzipCourse(content, id, newDataset, this.datasets, this.datasetId);
        }
    }
    removeDataset(id) {
        if (id === null) {
            return Promise.reject(new IInsightFacade_1.InsightError("id is null"));
        }
        if (id === " ") {
            return Promise.reject(new IInsightFacade_1.InsightError("id is empty string"));
        }
        if (id.includes("_")) {
            return Promise.reject(new IInsightFacade_1.InsightError("id should not include _"));
        }
        if (this.datasetId === []) {
            return Promise.reject(new IInsightFacade_1.NotFoundError("dataset is empty"));
        }
        return new Promise((resolve, reject) => {
            let isRemoved = false;
            try {
                isRemoved = DatasetDiskHelper_1.removeDatasetFromDisk(id);
            }
            catch (error) {
                return reject(error);
            }
            if (this.datasetId.includes(id)) {
                this.datasets.splice(this.datasetId.indexOf(id), 1);
                this.datasetId.splice(this.datasetId.indexOf(id), 1);
                isRemoved = true;
            }
            if (isRemoved) {
                return resolve(id);
            }
            else {
                return reject(new IInsightFacade_1.NotFoundError());
            }
        });
    }
    performQuery(query) {
        if (this.datasets.length !== 0) {
            try {
                const result = QueryPerform_1.handleQueryCourse(query, this);
                return Promise.resolve(result);
            }
            catch (error) {
                return Promise.reject(error);
            }
        }
        return Promise.reject(new IInsightFacade_1.InsightError("datasets is empty"));
    }
    listDatasets() {
        let datasetList;
        datasetList = [];
        this.datasets.forEach((data) => {
            let insightDataset = {};
            insightDataset.id = data.getId();
            insightDataset.kind = data.getKind();
            insightDataset.numRows = data.getNumRows();
            datasetList.push(insightDataset);
        });
        return Promise.resolve(datasetList);
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map