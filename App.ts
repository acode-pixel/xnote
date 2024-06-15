import fs from "fs";
import exp from "express";
import exps from "express-session";
const MemoryStore = require('memorystore')(exps);
import {v4 as uuidv4} from 'uuid';

var cmd = require("./cmd");

var app = exp();

app.use(exps(
    { name:'SessionCookie',
      genid: function(req) {
          console.log('session id created');
        return uuidv4()}, 
      secret: 'Secret1234',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
      store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      })
    }));

app.get("/", (req : exp.Request, res : exp.Response) => {
    fs.readFile("./index.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    }
)
});

app.get("/note", (req : exp.Request, res : exp.Response) => {
    var url = new URL(req.url ?? "", "http://" + req.headers.host);
    fs.readFile("./note.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    });
});

app.get("/command", (req : exp.Request, res : exp.Response) => {
    var url = new URL(req.url ?? "", "http://" + req.headers.host);
    cmd.command_parser(url.searchParams, res, req);
});

app.post("/command", (req : exp.Request, res : exp.Response) => {
    var url = new URL(req.url ?? "", "http://" + req.headers.host);
    cmd.command_parser(url.searchParams, res, req);
});

app.get("/About", (req : exp.Request, res : exp.Response) => {
    fs.readFile("./About.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    }
)
});

app.get("/style.css", (req : exp.Request, res : exp.Response) => {
    fs.readFile("./style.css", (err, data) => {
        res.writeHead(200, {"Content-type": "text/css"});
        res.write(data);
        res.end();
    }
)
});

app.listen(8080);
console.log("Listening on http://127.0.0.1:8080/");