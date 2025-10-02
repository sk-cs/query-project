/**
 * Created by rtholmes on 2016-06-19.
 * Updated to use Node.js built-in HTTP module for compatibility.
 */

import fs = require("fs");
import http = require("http");
import url = require("url");
import Log from "../Util";
import InsightFacade from "../controller/InsightFacade";
import {InsightError, NotFoundError, InsightDatasetKind} from "../controller/IInsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private server: http.Server;
    private static insightFacade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            if (that.server) {
                that.server.close(function () {
                    fulfill(true);
                });
            } else {
                fulfill(true);
            }
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        Server.insightFacade = new InsightFacade();
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.server = http.createServer((req, res) => {
                    // CORS headers
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

                    // Route handling
                    if (method === 'GET' && pathname.startsWith('/echo/')) {
                        Server.handleEcho(req, res, parsedUrl);
                    } else if (method === 'PUT' && pathname.startsWith('/dataset/')) {
                        Server.handlePutDataset(req, res, parsedUrl);
                    } else if (method === 'DELETE' && pathname.startsWith('/dataset/')) {
                        Server.handleDeleteDataset(req, res, parsedUrl);
                    } else if (method === 'POST' && pathname === '/query') {
                        Server.handlePostQuery(req, res);
                    } else if (method === 'GET' && pathname === '/datasets') {
                        Server.handleGetDatasets(req, res);
                    } else {
                        Server.handleStatic(req, res);
                    }
                });

                that.server.listen(that.port, function () {
                    Log.info("Server::start() - http listening on port: " + that.port);
                    fulfill(true);
                });

                that.server.on("error", function (err: string) {
                    Log.info("Server::start() - http ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    private static handleEcho(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(parsedUrl.pathname));
        try {
            const msg = parsedUrl.pathname?.split('/echo/')[1] || '';
            const response = Server.performEcho(msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result: response }));
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err }));
        }
    }

    private static handlePutDataset(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const pathParts = parsedUrl.pathname?.split('/') || [];
                const id = pathParts[2];
                const kind = pathParts[3];
                const base64Content = Buffer.from(body).toString('base64');
                
                Server.insightFacade.addDataset(id, base64Content, kind as InsightDatasetKind)
                    .then((result: any) => {
                        Log.info("Server::put(/dataset/:id/:kind) - responding " + 200);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ result: result }));
                    }).catch((error: any) => {
                        Log.error("Server::put(/dataset/:id/:kind) - responding 400");
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    });
            } catch (error) {
                Log.error(error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }

    private static handleDeleteDataset(req: http.IncomingMessage, res: http.ServerResponse, parsedUrl: url.UrlWithParsedQuery) {
        try {
            const pathParts = parsedUrl.pathname?.split('/') || [];
            const id = pathParts[2];
            
            Server.insightFacade.removeDataset(id)
                .then((result) => {
                    Log.info("Server::delete(/dataset/:id) - responding " + 200);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ result: result }));
                }).catch((error) => {
                    if (error instanceof InsightError) {
                        Log.error("Server::delete(/dataset/:id) - responding 400");
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    } else if (error instanceof NotFoundError) {
                        Log.error("Server::delete(/dataset/:id) - responding 404");
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
        } catch (error) {
            Log.error(error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    private static handlePostQuery(req: http.IncomingMessage, res: http.ServerResponse) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const query = JSON.parse(body);
                Server.insightFacade.performQuery(query)
                    .then((result) => {
                        Log.info("Server::post(/query) - responding " + 200);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ result: result }));
                    }).catch((error) => {
                        Log.error("Server::post(/query) - responding 400");
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message }));
                    });
            } catch (error) {
                Log.error(error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }

    private static handleGetDatasets(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            Server.insightFacade.listDatasets()
                .then((result) => {
                    Log.info("Server::get(/datasets) - responding " + 200);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ result: result }));
                }).catch((error) => {
                    Log.error("Server::get(/datasets) - responding 400");
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                });
        } catch (error) {
            Log.error(error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    private static handleStatic(req: http.IncomingMessage, res: http.ServerResponse) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url?.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.writeHead(500);
                res.end("File not found");
                Log.error(JSON.stringify(err));
                return;
            }
            res.writeHead(200);
            res.end(file);
        });
    }

}