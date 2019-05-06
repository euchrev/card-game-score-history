require("dotenv").config();
const express = require("express");
const payment = require("./payment");

const app = express();

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => res.render("pages/index"));

app.listen(PORT, console.log(`App listening on ${PORT}.`));
