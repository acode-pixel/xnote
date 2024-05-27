import fs from "fs";
import url from "url";
import exp from "express";
import exps from "express-session";
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
      cookie: { secure: false }
    }));

app.get("/", (req : exp.Request, res : exp.Response) => {
    fs.readFile("./index.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    }
)
});

app.get("/command", (req : exp.Request, res : exp.Response) => {
    var url = new URL(req.url ?? "", "http://" + req.headers.host);
    cmd.command_parser(url.searchParams, res, req);
});

app.get("/Doc.html", (req : exp.Request, res : exp.Response) => {
    fs.readFile("./Doc.html", (err, data) => {
        res.writeHead(200, {"Content-type": "text/html"});
        res.write(data);
        res.end();
    }
)
});

app.listen(8080);
console.log("Listening on http://127.0.0.1:8080/");