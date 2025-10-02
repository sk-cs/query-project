"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../controller/IInsightFacade");
const fs = require("fs");
const JSZip = require("jszip");
const parse5 = require("parse5");
const http = require("http");
const findInfoType = { building: "building", room: "room" };
const parseJsonCourse = (file) => {
    try {
        let object = JSON.parse(file);
        let listOfSections = [];
        if (!object.hasOwnProperty("result")) {
            throw new IInsightFacade_1.InsightError("invalid file in the zip file");
        }
        let numOfSection = 0;
        for (let section of object.result) {
            if (section.hasOwnProperty("Professor") && section.hasOwnProperty("Audit")
                && section.hasOwnProperty("Avg") && section.hasOwnProperty("Title")
                && section.hasOwnProperty("Pass") && section.hasOwnProperty("Fail")
                && section.hasOwnProperty("Subject") && section.hasOwnProperty("Course")
                && section.hasOwnProperty("id") && section.hasOwnProperty("Year")) {
                let sectionObject = {};
                sectionObject["instructor"] = section.Professor;
                sectionObject["audit"] = section.Audit;
                sectionObject["avg"] = section.Avg;
                sectionObject["title"] = section.Title;
                sectionObject["pass"] = section.Pass;
                sectionObject["fail"] = section.Fail;
                sectionObject["dept"] = section.Subject;
                sectionObject["id"] = section.Course;
                sectionObject["uuid"] = section.id.toString();
                if (section.Section === "overall") {
                    sectionObject["year"] = 1900;
                }
                else {
                    sectionObject["year"] = parseInt(section.Year, 10);
                }
                listOfSections.push(sectionObject);
                numOfSection++;
            }
        }
        return listOfSections;
    }
    catch (error) {
        throw new IInsightFacade_1.InsightError();
    }
};
const parseJsonBuilding = (htmlFile) => {
    try {
        let treeObject = parse5.parse(htmlFile);
        let buildingTableElement = findBuildingOrRoomTableContents(treeObject);
        let listOfBuilding = [];
        for (let building of buildingTableElement) {
            if (building !== undefined && building.nodeName === "tr") {
                let buildingInfo = findBuildingOrRoomInfo(building, findInfoType.building);
                listOfBuilding.push(buildingInfo);
            }
        }
        return listOfBuilding;
    }
    catch (error) {
        throw new IInsightFacade_1.InsightError(error);
    }
};
const parseListOfJsonRoom = (listOfBuildingInfo) => {
    try {
        let listOfRooms = [];
        for (let buildingInfo of listOfBuildingInfo) {
            listOfRooms = listOfRooms.concat(parseJsonRoom(buildingInfo));
        }
        return listOfRooms;
    }
    catch (error) {
        throw error;
    }
};
const parseJsonRoom = (buildingInfo) => {
    try {
        let listOfRooms = [];
        let buildingTreeObject = parse5.parse(buildingInfo.file);
        let roomTableElement = findBuildingOrRoomTableContents(buildingTreeObject);
        if (roomTableElement !== undefined) {
            for (let room of roomTableElement) {
                if (room !== undefined && room.nodeName === "tr") {
                    let roomInfo = findBuildingOrRoomInfo(room, findInfoType.room);
                    let roomObject = {};
                    roomObject["shortname"] = buildingInfo.shortname;
                    roomObject["fullname"] = buildingInfo.fullname;
                    roomObject["address"] = buildingInfo.address;
                    roomObject["number"] = roomInfo.number;
                    roomObject["name"] = buildingInfo.shortname.concat("_", roomInfo.number);
                    roomObject["lat"] = buildingInfo.lat;
                    roomObject["lon"] = buildingInfo.lon;
                    roomObject["seats"] = roomInfo.seats;
                    roomObject["type"] = roomInfo.type;
                    roomObject["furniture"] = roomInfo.furniture;
                    roomObject["href"] = roomInfo.href;
                    if (roomObject.fullname !== undefined && roomObject.shortname !== undefined &&
                        roomObject.number !== undefined && roomObject.name !== undefined &&
                        roomObject.address !== undefined && roomObject.lat !== undefined &&
                        roomObject.lon !== undefined && roomObject.seats !== undefined &&
                        roomObject.type !== undefined && roomObject.furniture !== undefined &&
                        roomObject.href !== undefined) {
                        listOfRooms.push(roomObject);
                    }
                }
            }
        }
        return listOfRooms;
    }
    catch (error) {
        throw new IInsightFacade_1.InsightError(error);
    }
};
const findBuildingOrRoomTableContents = (element) => {
    if (element.nodeName === "tbody" && element.childNodes) {
        return element.childNodes;
    }
    if (element.childNodes && element.childNodes.length > 0) {
        for (let child of element.childNodes) {
            let buildingTableElement = findBuildingOrRoomTableContents(child);
            if (buildingTableElement !== undefined) {
                return buildingTableElement;
            }
        }
    }
    return undefined;
};
const findBuildingOrRoomInfo = (rowOfTableOfBuildings, findType) => {
    let infoList = [];
    let childNodesHasNodeNamedLen = 3;
    let childNodesHasOneChildLen = 1;
    for (let buildingData of rowOfTableOfBuildings.childNodes) {
        if (buildingData.nodeName === "td" && buildingData.childNodes) {
            if (buildingData.childNodes.length === childNodesHasNodeNamedLen
                && buildingData.childNodes[1].nodeName === "a"
                && buildingData.childNodes[1].childNodes
                && buildingData.childNodes[1].childNodes.length > 0
                && buildingData.childNodes[1].childNodes[0].nodeName === "#text"
                && buildingData.childNodes[1].attrs
                && buildingData.childNodes[1].attrs.length > 0) {
                infoList.push(buildingData.childNodes[1].childNodes[0].value.trim());
                infoList.push(buildingData.childNodes[1].attrs[0].value.trim());
            }
            else if (buildingData.childNodes.length === childNodesHasOneChildLen
                && buildingData.childNodes[0].nodeName === "#text") {
                infoList.push(buildingData.childNodes[0].value.trim());
            }
        }
    }
    let numOfNeedBuildingInfo = 0;
    if (findInfoType.building === findType) {
        numOfNeedBuildingInfo = 4;
        if (infoList.length > numOfNeedBuildingInfo) {
            return { shortname: infoList[0], fullname: infoList[1], path: infoList[2], address: infoList[3],
                file: undefined, lat: undefined, lon: undefined };
        }
    }
    else if (findInfoType.room === findType) {
        numOfNeedBuildingInfo = 5;
        if (infoList.length > numOfNeedBuildingInfo) {
            return { number: infoList[0], href: infoList[1], seats: parseInt(infoList[2], 10),
                furniture: infoList[3], type: infoList[4] };
        }
    }
    throw new IInsightFacade_1.InsightError("table of building, Buildings and classrooms, has error");
};
const getPromisesForReadBuildingFilesInZip = (zip, buildingFilePathList) => {
    let buildingFilePromises = [];
    for (let buildingFilePath of buildingFilePathList) {
        buildingFilePromises.push(zip.file(buildingFilePath).async("string"));
    }
    return buildingFilePromises;
};
const getGeolocation = (buildingInfoList) => {
    let buildingGeolocationPromises = [];
    for (let buildingInfo of buildingInfoList) {
        let url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team068/";
        let address = buildingInfo.address.replace(/\s/g, "%20");
        url = url.concat(address);
        let geolocationPromise = new Promise((resolve, reject) => {
            http.get(url, (response) => {
                const { statusCode } = response;
                if (statusCode !== 200) {
                    return reject(new IInsightFacade_1.InsightError("connect status is not 200, not successful"));
                }
                response.setEncoding("utf8");
                let rawData = "";
                response.on("data", (chunk) => {
                    rawData += chunk;
                });
                response.on("end", () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        if (parsedData.error !== undefined) {
                            return reject(new IInsightFacade_1.InsightError("response result is error"));
                        }
                        buildingInfo.lon = parsedData.lon;
                        buildingInfo.lat = parsedData.lat;
                        return resolve();
                    }
                    catch (error) {
                        throw new IInsightFacade_1.InsightError("getting geolocation got error");
                    }
                });
            });
        });
        buildingGeolocationPromises.push(geolocationPromise);
    }
    return buildingGeolocationPromises;
};
exports.unzipParseHtmlRoom = (content, id, newDataset, datasets, datasetId) => {
    let savedJSZip;
    let buildingInfoList;
    return JSZip.loadAsync(content, { base64: true })
        .then((zip) => {
        savedJSZip = zip;
        let RoomFolder = zip.folder("rooms");
        return RoomFolder.file("index.htm").async("string");
    }).then((htmlFile) => {
        buildingInfoList = parseJsonBuilding(htmlFile);
        return Promise.all(getGeolocation(buildingInfoList));
    }).then(() => {
        let buildingFileList = [];
        for (let building of buildingInfoList) {
            let buildingFilePath = "rooms".concat(building.path.substring(1));
            buildingFileList.push(buildingFilePath);
        }
        return Promise.all(getPromisesForReadBuildingFilesInZip(savedJSZip, buildingFileList));
    }).then((buildingFiles) => {
        if (buildingFiles.length !== buildingInfoList.length) {
            throw new IInsightFacade_1.InsightError();
        }
        for (let i in buildingFiles) {
            buildingInfoList[i].file = buildingFiles[i];
        }
        let roomList = parseListOfJsonRoom(buildingInfoList);
        newDataset.addObjects(roomList);
        let savedFileName = __dirname.concat("/../../data/", id);
        if (roomList.length !== 0) {
            fs.writeFileSync(savedFileName, JSON.stringify(roomList));
        }
        datasetId.push(id);
        datasets.push(newDataset);
        return Promise.resolve(datasetId);
    }).catch((error) => Promise.reject(new IInsightFacade_1.InsightError(error)));
};
exports.unzipCourse = (content, id, newDataset, datasets, datasetId) => {
    return JSZip.loadAsync(content, { base64: true })
        .then((zip) => {
        const coursesFolder = zip.folder("courses");
        let filePromises = [];
        coursesFolder.forEach((relativePath, file) => {
            filePromises.push(file.async("string"));
        });
        if (filePromises.length === 0) {
            throw new IInsightFacade_1.InsightError("the folder is empty");
        }
        return Promise.all(filePromises);
    }).then((files) => {
        let sectionList = [];
        for (let file of files) {
            sectionList = sectionList.concat(parseJsonCourse(file));
        }
        newDataset.addObjects(sectionList);
        let savedFileName = __dirname.concat("/../../data/", id);
        if (sectionList.length !== 0) {
            fs.writeFileSync(savedFileName, JSON.stringify(sectionList));
        }
        datasetId.push(id);
        datasets.push(newDataset);
        return Promise.resolve(datasetId);
    }).catch((error) => Promise.reject(new IInsightFacade_1.InsightError(error)));
};
//# sourceMappingURL=DatasetHelper.js.map