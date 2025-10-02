"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const http = require("http");
const url = require("url");
const Util_1 = require("../Util");
const InsightFacade_1 = require("../controller/InsightFacade");
const IInsightFacade_1 = require("../controller/IInsightFacade");
class Server {
    constructor(port) {
        Util_1.default.info("Server::<init>( " + port + " )");
        this.port = port;
    }
    stop() {
        Util_1.default.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            if (that.server) {
                that.server.close(function () {
                    fulfill(true);
                });
            }
            else {
                fulfill(true);
            }
        });
    }
    start() {
        const that = this;
        Server.insightFacade = new InsightFacade_1.default();
        return new Promise(function (fulfill, reject) {
            try {
                Util_1.default.info("Server::start() - start");
                that.server = http.createServer((req, res) => {
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
                    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                    if (req.method === 'OPTIONS') {
                        res.writeHead(200);
                        res.end();
                        return;
                    }
                    const parsedUrl = url.parse(req.url || '', true);
                    const pathname = parsedUrl.pathname || '';
                    const method = req.method || '';
                    if (method === 'GET' && pathname.startsWith('/echo/')) {
                        Server.handleEcho(req, res, parsedUrl);
                    }
                    else if (method === 'PUT' && pathname.startsWith('/dataset/')) {
                        Server.handlePutDataset(req, res, parsedUrl);
                    }
                    else if (method === 'DELETE' && pathname.startsWith('/dataset/')) {
                        Server.handleDeleteDataset(req, res, parsedUrl);
                    }
                    else if (method === 'POST' && pathname === '/query') {
                        Server.handlePostQuery(req, res);
                    }
                    else if (method === 'GET' && pathname === '/datasets') {
                        Server.handleGetDatasets(req, res);
                    }
                    else {
                        Server.handleStatic(req, res);
                    }
                });
                that.server.listen(that.port, function () {
                    Util_1.default.info("Server::start() - http listening on port: " + that.port);
                    fulfill(true);
                });
                that.server.on("error", function (err) {
                    Util_1.default.info("Server::start() - http ERROR: " + err);
                    reject(err);
                });
            }
            catch (err) {
                Util_1.default.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }
    static handleEcho(req, res, parsedUrl) {
        var _a;
        Util_1.default.trace("Server::echo(..) - params: " + JSON.stringify(parsedUrl.pathname));
        try {
            const msg = ((_a = parsedUrl.pathname) === null || _a === void 0 ? void 0 : _a.split('/echo/')[1]) || '';
            const response = Server.performEcho(msg);
            Util_1.default.info("Server::echo(..) - responding " + 200);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result: response }));
        }
        catch (err) {
            Util_1.default.error("Server::echo(..) - responding 400");
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err }));
        }
    }
    static handlePutDataset(req, res, parsedUrl) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            var _a;
            try {
                const pathParts = ((_a = parsedUrl.pathname) === null || _a === void 0 ? void 0 : _a.split('/')) || [];
                const id = pathParts[2];
                const kind = pathParts[3];
                const base64Content = Buffer.from(body).toString('base64');
                Server.insightFacade.addDataset(id, base64Content, kind)
                    .then((result) => {
                    Util_1.default.info("Server::put(/dataset/:id/:kind) - responding " + 200);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ result: result }));
                }).catch((error) => {
                    Util_1.default.error("Server::put(/dataset/:id/:kind) - responding 400");
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });
            }
            catch (error) {
                Util_1.default.error(error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    static handleDeleteDataset(req, res, parsedUrl) {
        var _a;
        try {
            const pathParts = ((_a = parsedUrl.pathname) === null || _a === void 0 ? void 0 : _a.split('/')) || [];
            const id = pathParts[2];
            Server.insightFacade.removeDataset(id)
                .then((result) => {
                Util_1.default.info("Server::delete(/dataset/:id) - responding " + 200);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ result: result }));
            }).catch((error) => {
                if (error instanceof IInsightFacade_1.InsightError) {
                    Util_1.default.error("Server::delete(/dataset/:id) - responding 400");
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
                else if (error instanceof IInsightFacade_1.NotFoundError) {
                    Util_1.default.error("Server::delete(/dataset/:id) - responding 404");
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
                else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        }
        catch (error) {
            Util_1.default.error(error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    static handlePostQuery(req, res) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const query = JSON.parse(body);
                Server.insightFacade.performQuery(query)
                    .then((result) => {
                    Util_1.default.info("Server::post(/query) - responding " + 200);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ result: result }));
                }).catch((error) => {
                    Util_1.default.error("Server::post(/query) - responding 400");
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });
            }
            catch (error) {
                Util_1.default.error(error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    static handleGetDatasets(req, res) {
        try {
            Server.insightFacade.listDatasets()
                .then((result) => {
                Util_1.default.info("Server::get(/datasets) - responding " + 200);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ result: result }));
            }).catch((error) => {
                Util_1.default.error("Server::get(/datasets) - responding 400");
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            });
        }
        catch (error) {
            Util_1.default.error(error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
    static handleStatic(req, res) {
        var _a;
        const publicDir = "frontend/public/";
        Util_1.default.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + ((_a = req.url) === null || _a === void 0 ? void 0 : _a.split("/").pop());
        }
        fs.readFile(path, function (err, file) {
            if (err) {
                res.writeHead(500);
                res.end("File not found");
                Util_1.default.error(JSON.stringify(err));
                return;
            }
            res.writeHead(200);
            res.end(file);
        });
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map