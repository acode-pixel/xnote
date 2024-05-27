
import http from "http";
import mysql from "mysql2";
import crypto from "crypto";
import exp from "express";

declare module 'express-session' {
    interface SessionData {
      folders: string;
    }
  }

var con = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: ""
});

con.connect(function(err) {
    if(err) throw err;
    console.log("mysql DB connected");
});

con.query("create database if not exists xnote_db");
con.query("use xnote_db", function(err){
    if(err) throw err;
    console.log("using xnote_db");
});

function command_parser(query : URLSearchParams, res : exp.Response, req : exp.Request){
    if(query.get("cmd") == "create_folder"){
        try{
            con.query("create table if not exists " + query.get("title") + " (noteID varchar(20), noteTitle tinytext, note mediumtext)");
        }
        catch (err){
            console.log(err);
            res.writeHead(500);
            res.end();
        }
        finally{
            if(!res.closed){
                req.session.folders = "test";
                res.writeHead(200);
                res.end();
            }
        }
    } else if(query.get("cmd") == "update"){
        var data = {"hasUpdate": null};
        res.writeHead(200);
        res.write(JSON.stringify(data));
        res.end();
    } else {
        res.writeHead(400);
        res.end();
    }
}

exports.command_parser = command_parser;
exports.con = con;