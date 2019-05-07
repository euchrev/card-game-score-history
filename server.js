const pg = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const express = require("express");
const payment = require("./payment");
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.SECRET;

app.set("view engine", "ejs");

app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(cookieParser());
app.use(methodOverride('_method'));
const client = new pg.Client(DATABASE_URL);
client.connect();
client.on("err", err => console.log(err));

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: true
  })
);

app.get("/", (req, res) => res.render("pages/index"));
app.get("/login", (req, res) => res.render("pages/login"));
app.get("/dashboard", (req, res) => console.log(req.cookies.auth));
app.get("/groups", (req, res) => loginGroup(req.query, res));
app.get(
  "/logout",
  (req, res) => res.clearCookie("auth") && res.redirect("/login")
);
app.post("/groups", (req, res) => createGroup(req.query, res));

const lookupGroup = handler => {
  const SQL = "SELECT * FROM groups WHERE name=$1";
  const values = [handler.query.name];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length
        ? handler.cacheMiss(results)
        : handler.cacheHit(results)
    );
};

function Group(info) {
  (this.name = info.name),
    (this.email = info.email),
    (this.password = info.password),
    (this.paid = info.paid);
}

Group.prototype.save = function() {
  const SQL =
    "INSERT INTO groups (name, email, password, paid) VALUES($1,$2,$3,$4) RETURNING id";
  const values = Object.values(this);
  return client.query(SQL, values);
};

const createGroup = (req, res) => {
  const validation = [
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(
      req.email
    ),
    /(?=.{8,})/.test(req.password)
  ];
  const handler = {
    query: req,
    cacheHit: result => {
      res.send("Cache hit");
    },
    cacheMiss: result => {
      const hashedPassword = bcrypt.hashSync(req.password, 8);
      const groupInfo = {
        name: req.name,
        email: req.email,
        password: hashedPassword,
        paid: req.paid
      };
      if (validation.every(result => result === true)) {
        const newGroup = new Group(groupInfo);
        newGroup.save().then(result => {
          const token = jwt.sign(
            {
              id: result.rows[0].id
            },
            SECRET
          );
          res.clearCookie("auth");
          res.cookie("auth", token);
          res.redirect("/dashboard");
        });
      }
    }
  };

  lookupGroup(handler);
};

const loginGroup = (req, res) => {
  const handler = {
    query: req,
    cacheHit: result => {
      const passwordIsValid = bcrypt.compareSync(
        req.password,
        result.rows[0].password
      );
      if (passwordIsValid) {
        const token = jwt.sign(
          {
            id: result.rows[0].id
          },
          SECRET
        );
        res.clearCookie("auth");
        res.cookie("auth", token);
        res.redirect("/dashboard");
      } else {
        handler.cacheMiss();
      }
    },
    cacheMiss: result => {
      res.send("Cache miss");
    }
  };

  lookupGroup(handler);
};

app.post("/payment", (req, res) => payment.processPayment(req, res));

app.post("/payment", (req, res) => payment.processPayment(req, res));

app.post("/payment", (req, res) => payment.processPayment(req, res));

app.listen(PORT, console.log(`App listening on ${PORT}.`));
