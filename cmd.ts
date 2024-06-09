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

function reconnect_db(){
    con = mysql.createConnection({
        host: "127.0.0.1",
        user: "root",
        password: "donald1417"
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


setInterval(function () {
    try{
        con.query('SELECT 1');
    } catch (err){
        reconnect_db();
    }
}, 5000);

//TODO add note creator

function command_parser(query : URLSearchParams, res : exp.Response, req : exp.Request){
    if(query.get("cmd") == "create_folder"){
        if(req.session.folders?.find(folder => folder === query.get("title")) == undefined && query.get("title")){
            let regex = /[^0-9A-Z ]/i;
            if(regex.test(query.get("title") || "")){
                res.writeHead(500);
                res.end();
                return;
            }
            try {
                con.query("create table `" + query.get("title") + "` (ownerSession varchar(36), noteTitle tinytext, note mediumtext, noteID int not null AUTO_INCREMENT PRIMARY KEY)");
            } catch (err){
                console.log(err);
                res.writeHead(500);
                res.end();
                res.emit("close");
                reconnect_db();
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

    }else if(query.get("cmd") == "create_note"){
        try {
            con.query("insert into `" + query.get("folder") + "` (ownerSession) values ('" + req.sessionID + "')");
        } catch (err){
            console.log(err);
            res.writeHead(500);
            res.end();
            res.emit("close");
            reconnect_db();
            return;
        }

        if(!res.closed){
            //res.redirect("/note");
            res.writeHead(200);
            res.end();
        }

    }else if(query.get("cmd") == "delete_folder"){
        if(req.session.folders?.find(folder => folder === query.get("title"))){
            try{
                con.query("delete * from `" + query.get("title") + "` where noteID = " + req.sessionID);
            } catch(err){
                console.log(err);
                res.writeHead(500);
                res.end();
                res.emit("close");
                reconnect_db();
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

    }else if(query.get("cmd") == "update"){
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
    } else if(query.get("cmd") == "delete_folder"){
        var id = req.session.folders?.findIndex(folder => folder === query.get("title"), 0);
        req.session.folders?.splice(id || 0, (id == undefined || id >= 0) ? 1 : 0); 
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
