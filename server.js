require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const { Client } = require('pg');
const client = new Client(process.env.DATABASE_URL);
client.connect(console.log('Client Connected'));
client.on('err', err => console.log(err));

app.set("view engine", "ejs");
app.get("/", (req, res) => res.render("pages/index"));
app.listen(PORT, console.log(`App listening on ${PORT}.`));
