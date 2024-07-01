import mysql from "mysql2";
import exp from "express";
import { SessionData } from "express-session";

declare module "express-session" {
  interface SessionData {
    folders: Array<string>;
    hasUpdate: boolean;
  }
}

class notes {
  ownerSession: string | undefined;
  noteTitle: string | undefined;
  note: string | undefined;
  noteID: number | undefined;
}

var con = mysql.createConnection({
    host: "127.0.0.1",
    user: "web",
    password: "web1234"
});

function connect_db() {
  con.connect(function (err: any) {
    if (err) throw err;
    console.log("mysql DB connected");
  });

  con.query("set session wait_timeout = 31536000");
  con.query("create database if not exists xnote_db");
  con.query("use xnote_db", function (err) {
    if (err) throw err;
    console.log("using xnote_db");
  });
}

connect_db();

setInterval(function () {
  try {
    con.query("SELECT 1");
  } catch (err) {
    connect_db();
  }
}, 2000);

async function execute_on_mysql(cmd: string) {
  console.log(cmd);
  var result: any;
  try {
    result = await con.promise().query(cmd);
    return result[0];
  } catch (err) {
    console.log(err);
    throw "command failed";
  }
}

async function command_parser(
  query: URLSearchParams,
  res: exp.Response,
  req: exp.Request
) {
  if (query.get("cmd") == "create_folder") {
    if (
      req.session.folders?.find((folder) => folder === query.get("title")) ==
        undefined &&
      query.get("title")
    ) {
      let regex = /[^0-9A-Z ]/i;
      if (regex.test(query.get("title") || "")) {
        res.writeHead(500);
        res.end();
        return;
      }
      try {
        execute_on_mysql(
          "create table if not exists `" +
            query.get("title") +
            "` (ownerSession varchar(36), noteTitle tinytext, note mediumtext, noteID int not null AUTO_INCREMENT PRIMARY KEY)"
        );
      } catch (err) {
        console.log(err);
        res.writeHead(500);
        res.end();
        res.emit("close");
        connect_db();
        return;
      }

      if (!res.closed) {
        write_update(req, query);
        res.writeHead(200);
        res.end();
      }
    } else {
      res.writeHead(500);
      res.end();
    }
  } else if (query.get("cmd") == "create_note") {
    try {
      execute_on_mysql(
        "insert into `" +
          query.get("folder") +
          "` (ownerSession) values ('" +
          req.sessionID +
          "')"
      );
    } catch (err) {
      res.writeHead(500);
      res.end();
      res.emit("close");
      connect_db();
      return;
    }

    if (!res.closed) {
      var result: Array<notes> = await execute_on_mysql(
        "select * from `" +
          query.get("folder") +
          "` where ownerSession = '" +
          req.sessionID +
          "' order by noteID desc limit 1"
      );
      res.redirect(
        "/note?folder=" + query.get("folder") + "&noteID=" + result[0].noteID
      );
      res.end();
    }
  } else if (query.get("cmd") == "save_note") {
    var check = await execute_on_mysql(
      "select true where exists (select * from `" +
        query.get("folder") +
        "` where noteID = " +
        query.get("noteID") +
        " and ownerSession = '" +
        req.sessionID +
        "')"
    );

    if (check[0] != null) {
      try {
        var note_data: string = req.body.noteData;
        var title: string =
          note_data.length > 35
            ? note_data.substring(0, 32) + "..."
            : note_data;
        await execute_on_mysql(
          "update `" +
            query.get("folder") +
            "` set note = '" +
            note_data +
            "' where noteID = " +
            query.get("noteID")
        );
        await execute_on_mysql(
          "update `" +
            query.get("folder") +
            "` set noteTitle = '" +
            title +
            "' where noteID = " +
            query.get("noteID")
        );
      } catch (err) {
        res.writeHead(500);
        res.end();
        res.emit("close");
        connect_db();
        return;
      }

      if (!res.closed) {
        write_update(req, query);
        res.writeHead(200);
        res.end();
      }
    } else {
      res.writeHead(500);
      res.end();
    }
  } else if (query.get("cmd") == "delete_folder") {
    if (req.session.folders?.find((folder) => folder === query.get("title"))) {
      try {
        execute_on_mysql(
          "delete from `" +
            query.get("title") +
            "` where ownerSession = '" +
            req.sessionID +
            "'"
        );
      } catch (err) {
        res.writeHead(500);
        res.end();
        res.emit("close");
        connect_db();
        return;
      }

      if (!res.closed) {
        write_update(req, query);
        res.writeHead(200);
        res.end();
      }
    } else {
      res.writeHead(500);
      res.end();
    }
  } else if (query.get("cmd") == "delete_note") {
    var check = await execute_on_mysql(
      "select true where exists (select * from `" +
        query.get("folder") +
        "` where noteID = " +
        query.get("noteID") +
        " and ownerSession = '" +
        req.sessionID +
        "')"
    );

    if (check[0] == null) {
      res.writeHead(500);
      res.end();
      return;
    }

    try {
      await execute_on_mysql(
        "delete from `" +
          query.get("folder") +
          "` where noteID=" +
          query.get("noteID")
      );
    } catch (err) {
      res.writeHead(500);
      res.end();
      res.emit("close");
      connect_db();
      return;
    }

    if (!res.closed) {
      write_update(req, query);
      res.writeHead(200);
      res.end();
    }
  } else if (query.get("cmd") == "update") {
    var data = await get_session_data(req);
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

function write_update(req: exp.Request, query: URLSearchParams) {
  if (query.get("cmd") == "create_folder") {
    if (req.session.folders == undefined) {
      req.session.folders = new Array();
    }
    req.session.folders.push(query.get("title") || "");
    req.session.hasUpdate = true;
  } else if (query.get("cmd") == "delete_folder") {
    var id = req.session.folders?.findIndex(
      (folder) => folder === query.get("title"),
      0
    );
    req.session.folders?.splice(id || 0, id == undefined || id >= 0 ? 1 : 0);
    req.session.hasUpdate = true;
  } else if (query.get("cmd") == "save_note" || query.get("cmd") == "delete_note") {
    req.session.hasUpdate = true;
  }
}

async function get_session_data(req: exp.Request) {
  var data = { folders: new Array(), hasUpdate: false };

  for (var i = 0; i < (req.session.folders?.length || 0); i++) {
    var folder = { folderTitle: new String(), notes: new Array() };
    folder.folderTitle = req.session.folders?.at(i) || "";

    var result: Array<notes> = await execute_on_mysql(
      "select * from `" +
        folder.folderTitle +
        "` where ownerSession = '" +
        req.sessionID +
        "'"
    );
    result.forEach(function (val, index) {
      var note = {
        noteTitle: new String(),
        noteData: new String(),
        noteID: new String(),
      };
      note.noteTitle = val.noteTitle || "";
      note.noteID = val.noteID?.toString() || "";
      note.noteData = val.note || "";

      folder.notes[index] = note;
    });
    data.folders[i] = folder;
  }

  data.hasUpdate = req.session.hasUpdate || false;
  req.session.hasUpdate = false;
  return data;
}
