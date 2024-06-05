import mysql from "mysql2";
import exp from "express";
import { SessionData } from "express-session";

declare module 'express-session' {
    interface SessionData {
      folders: Array<String>;
      hasUpdate: boolean;
    }
  }

var con = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "donald1417"
});

function reconnect_db(con : any){
    con = mysql.createConnection({
        host: "127.0.0.1",
        user: "root",
        password: ""
    });

    con.connect(function(err : any) {
        if(err) throw err;
        console.log("mysql DB connected");
    });
}

con.connect(function(err) {
    if(err) throw err;
    console.log("mysql DB connected");
});

con.query("create database if not exists xnote_db");
con.query("use xnote_db", function(err){
    if(err) throw err;
    console.log("using xnote_db");
});

//TODO add note creator

function command_parser(query : URLSearchParams, res : exp.Response, req : exp.Request){
    if(query.get("cmd") == "create_folder"){
        if(req.session.folders?.find(folder => folder === query.get("title")) == undefined){

            try {
                con.query("create table " + query.get("title") + " (noteID varchar(20), noteTitle tinytext, note mediumtext)");
            } catch (err){
                res.writeHead(500);
                res.end();
                res.emit("close");
                reconnect_db(con);
                return;
            }

            if(!res.closed){
                write_update(req, query, res);
                res.writeHead(200);
                res.end();
            }
        } else {
            res.writeHead(500);
            res.end();
        }

    } else if(query.get("cmd") == "update"){
        var data = get_session_data(req);
        res.writeHead(200);
        res.write(JSON.stringify(data) || "");
        res.end();
    } else {
        res.writeHead(400);
        res.end();
    }
}

exports.command_parser = command_parser;
exports.con = con;

function write_update(req: exp.Request, query: URLSearchParams, res : exp.Response) {
    if(query.get("cmd") == "create_folder"){
        if(req.session.folders == undefined){
            req.session.folders = new Array;
        }
        req.session.folders.push(query.get("title") || "");
        req.session.hasUpdate = true;
    }
}
function get_session_data(req: exp.Request) {
    var data : SessionData = {cookie: req.session.cookie, folders : new Array<String>, hasUpdate : false};
    data.folders = req.session.folders || new Array;
    data.hasUpdate = req.session.hasUpdate || false;
    req.session.hasUpdate = false;
    return data;
}

