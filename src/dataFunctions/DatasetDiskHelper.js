"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Dataset_1 = require("../dataStructure/Dataset");
const IInsightFacade_1 = require("../controller/IInsightFacade");
const fs = require("fs");
exports.loadDatasetFromDisk = (datasets, datasetId) => {
    let path = __dirname.concat("/../../data/");
    try {
        let fileNames = fs.readdirSync(path);
        if (fileNames.length !== 0) {
            for (let fileName of fileNames) {
                path = path.concat(fileName);
                let newDataset = new Dataset_1.default();
                let objects = JSON.parse(fs.readFileSync(path).toString());
                newDataset.addObjects(objects);
                newDataset.setKind(IInsightFacade_1.InsightDatasetKind.Courses);
                newDataset.setId(fileName);
                datasets.push(newDataset);
                datasetId.push(fileName);
            }
        }
    }
    catch (error) {
        return;
    }
};
exports.removeDatasetFromDisk = (datasetId) => {
    let path = __dirname.concat("/../../data/");
    try {
        let fileNames = fs.readdirSync(path);
        if (fileNames.includes(datasetId)) {
            path = path.concat(datasetId);
            fs.unlinkSync(path);
            return true;
        }
        return false;
    }
    catch (error) {
        throw new IInsightFacade_1.InsightError();
    }
};
//# sourceMappingURL=DatasetDiskHelper.js.map