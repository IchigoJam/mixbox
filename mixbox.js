import { serveMixJuice } from "./serveMixJuice.js";
import { DateTime } from "https://js.sabae.cc/DateTime.js";

const read = async (fn) => {
  try {
    return JSON.parse(await Deno.readTextFile(fn));
  } catch (e) {
    return { data: [] };
  }
};
const write = async (fn, json) => {
  await Deno.writeTextFile(fn, JSON.stringify(json, null, 2));
};

const unique = (json) => {
  const chk = {};
  const res = [];
  for (let i = json.length - 1; i >= 0; i--) {
    const d = json[i];
    if (chk[d.id] == undefined) {
      res.push(d);
      chk[d.id] = res;
    }
  }
  return res;
};

const uniqueArray = (data, r, fcond, isjson) => {
  const ids = {};
  for (const d of data) {
    const c = ids[d.id];
    const n = parseInt(d.data);
    if (!c) {
      ids[d.id] = n;
    } else if (fcond(n, ids[d.id])) {
      ids[d.id] = n;
    }
  }
  if (isjson) {
    return JSON.stringify(ids, null, 2);
  }
  const res = [];
  for (const name in ids) {
    res.push(name);
    res.push(parseInt(r * ids[name]));
  }
  return res.join("\n") + "\n";
};

serveMixJuice(async (path, params, bdata) => {
  //console.log("path", path, params, bdata)
  const name = path.split("/")[1].toLowerCase();
  if (name.indexOf("..") >= 0 || name.length == 0) {
    return;
  }
  const fn = "data/" + name + ".json";

  const json = await read(fn);
  const id = params.get("ID");
  if (id != undefined) {
    if (params.get("LOCK") != undefined && json.owner == id) {
      json.locked = true;
    } else if (params.get("UNLOCK") != undefined && json.owner == id) {
      json.locked = false;
    } else if (params.get("CLEAR") != undefined && json.owner == id) {
      if (json.locked) {
        return "'LOCKED";
      } else {
        json.data = [];
      }
    } else {
      const d = parseInt(params.get("D"));
      if (isNaN(d)) {
        return "'ERR";
      }
      if (json.locked) {
        return "'LOCKED";
      }
      const dt = new DateTime().toString();
      json.data.push({ dt, id, data: d });
      if (json.owner == undefined) {
        json.owner = id;
        json.created = dt;
        json.locked = false;
      }
    }
    await write(fn, json);
    return "OK";
  }
  const cmd = params.get("C") || "GET";
  const flgunique = params.get("U") != undefined;
  const data = flgunique ? unique(json.data) : json.data;
  const d = parseInt(params.get("D")) || 0;
  const n = parseInt(params.get("N")) || 1;
  const r = parseFloat(params.get("R")) || 1;
  const isjson = params.get("JSON") != undefined || false;

  if (cmd == "LEN") {
    return data.length + "\n";
  } else if (cmd == "GET") {
    const res = [];
    for (let i = 0; i < n; i++) {
      res.push(parseInt((data[data.length - 1 - (i + d)]?.data || 0) * r));
    }
    return res.join("\n") + "\n";
  } else if (cmd == "MAX") {
    return parseInt(data.reduce((prev, cur) => parseInt(cur.data) > prev ? parseInt(cur.data): prev, Number.MIN_SAFE_INTEGER) * r) + "\n";
  } else if (cmd == "MIN") {
    return parseInt(data.reduce((prev, cur) => parseInt(cur.data) < prev ? parseInt(cur.data): prev, Number.MAX_SAFE_INTEGER) * r) + "\n";
  } else if (cmd == "SUM") {
    return parseInt(data.reduce((prev, cur) => parseInt(cur.data) + prev, 0) * r) + "\n";
  } else if (cmd == "AVE") {
    return parseInt(data.reduce((prev, cur) => parseInt(cur.data) + prev, 0) / data.length * r) + "\n";
  } else if (cmd == "RANK") {
    return data.reduce((prev, cur) => parseInt(cur.data) > d ? prev + 1 : prev, 1) + "\n";
  } else if (cmd == "SD") {
    const ave = data.reduce((prev, cur) => parseInt(cur.data) + prev, 0) / data.length;
    const s = Math.sqrt(data.reduce((prev, cur) => Math.pow(cur.data - ave, 2) + prev, 0) / data.length);
    const sd = (d - ave) / s * 10 + 50;
    return parseInt(sd * r) + "\n";
  } else if (cmd == "UMIN") {
    return uniqueArray(json.data, r, (a, b) => a < b, isjson);
  } else if (cmd == "UMAX") {
    return uniqueArray(json.data, r, (a, b) => a > b, isjson);
  }
  return "'" + path + " " + params; //  + " " + data;
});
