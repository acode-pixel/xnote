
import http from "http";
import mysql from "mysql2";
import crypto from "crypto";

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

function errCallback(err: any){
    if(err){
        throw err;
    }
}

function command_parser(query : URLSearchParams, res : http.ServerResponse){
    if(query.get("cmd") == "create_folder"){
        try{
            con.query("create table if not exists test (noteID varchar(20), noteTitle tinytext, note mediumtext)", errCallback);
        }
        catch {
            res.writeHead(500);
            res.end();
        }
        finally{
            if(!res.closed){
                res.writeHead(200);
                res.end();
            }
        }
    }
}

exports.command_parser = command_parser;
exports.con = con;