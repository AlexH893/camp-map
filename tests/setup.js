import "@babel/register";
import app from "../server.js";
import http from "http";
import { expect } from "chai";
import supertest from "supertest";

let server;
let request;

before(async () => {
  return new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(3001, (err) => {
      if (err) {
        return reject(err);
      }
      request = supertest(server);
      resolve();
    });
  });
});

after(async () => {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
});

export { request, expect };
