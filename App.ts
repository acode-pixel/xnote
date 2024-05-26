import http from "http";
import fs from "fs";
import url from "url";
var cmd = require("./cmd");

http.createServer((req, res) => {
    var url = new URL(req.url ?? "", "http://" + req.headers.host);
    if(url.pathname == "/"){
    fs.readFile("./index.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    });
    } else {
        if(url.pathname == "/command"){
            cmd.command_parser(url.searchParams, res);
            return;
        }
        fs.readFile("." + url.pathname, (err, data) => {
            if(err){
                res.writeHead(404);
                res.end();
            } else {
                res.writeHead(200, {"Content-type": "text/html"});
                res.write(data);
                res.end();
            }
    });
    }
}).listen(8080);

console.log("Listening on http://127.0.0.1:8080/");