const pg = require("pg");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.SECRET;
const GoogleSpreadsheet = require("google-spreadsheet");
const { promisify } = require("util");
const creds = require("./client_secret.json");
const async = require("async");

app.set("view engine", "ejs");
app.use(
  express.urlencoded({
    extended: true
  })
);
app.use(cookieParser());
const client = new pg.Client(DATABASE_URL);
client.connect();
client.on("err", err => console.log(err));
const doc = new GoogleSpreadsheet(
  "10PIDgiRsDs7JxNNYZBknTV8y78gCBt20-DPifqLCgJc"
);
// function connectToSpreedsheet() {}

// function getSpreedSheetData() {
//   doc.getInfo(function(err, info) {
//     console.log("Loaded doc: " + info.title + " by " + info.author.email);
//     sheet = info.worksheets[0];
//     console.log(
//       "sheet 1: " + sheet.title + " " + sheet.rowCount + "x" + sheet.colCount
//     );

//     // const sheet = info.worksheets[0];
//     // console.log(
//     //   `Title: ${sheet.title}, Rows: ${sheet.rowCount} Columns: ${sheet.row}`
//     // );
//   });
// }

// connectToSpreedsheet();

async.series(
  [
    function setAuth(step) {
      console.log("set auth");
      // const creds_json = {
      //   type: process.env.TYPE,
      //   project_id: process.env.PROJECT_ID,
      //   private_key_id: process.env.PRIVATE_KEY_ID,
      //   private_key: process.env.PRIVATE_KEY,
      //   client_email: process.env.CLIENT_EMAIL,
      //   client_id: process.env.CLIENT_ID,
      //   auth_uri: process.env.AUTH_URI,
      //   token_uri: process.env.TOKEN_URI,
      //   auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
      //   client_x509_cert_url: process.env.CLIENT_X509_CERT_URL
      // };

      doc.useServiceAccountAuth(creds, step);
    },

    function getInfoAndWorksheets(step) {
      console.log("get data");
      doc.getInfo(function(err, info) {
        console.log("Loaded doc: " + info.title + " by " + info.author.email);
        sheet = info.worksheets[0];
        console.log(
          "sheet 1: " +
            sheet.title +
            " " +
            sheet.rowCount +
            "x" +
            sheet.colCount
        );
        sheet.getRows(
          {
            offset: 1,
            limit: 20,
            orderby: "col2"
          },
          function(err, rows) {
            console.log(rows);
          }
        );
        step();
      });
    }
  ],
  function(err) {
    if (err) {
      console.log("ERROR:" + err);
    }
  }
);

app.get("/", (req, res) => res.render("pages/index"));
app.get("/dashboard", (req, res) => console.log(req.cookies.auth));
app.post("/groups", (req, res) => createGroup(req.query, res));

const lookupGroup = handler => {
  const SQL = "SELECT * FROM groups WHERE name=$1";
  const values = [handler.query.name];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length ? handler.cacheMiss() : handler.cacheHit()
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
    cacheHit: () => {
      res.send("Cache hit");
    },
    cacheMiss: () => {
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

app.listen(PORT, console.log(`App listening on ${PORT}.`));

// TYPE=service_account
// PROJECT_ID=deltav-1556021309349
// PRIVATE_KEY_ID=7f41dcb3234a7d806097d5e295f4630c2af95320
// PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCcCnBCgMSnRe6a\njSum7yh/Zx0sH76x2E4ki8XANjQwgSnBBEnpCTUv/gkVNRKLnSFWwIw8xhuUymN7\nR3n1fBZSWd1N8GZzL9QWxcAp+W2XOHUFfCydiQ2aRfl3fgfducksajnyGtX9eRse\nJXPYUIg61005viOSdX4lScai/MMAc7oLmcd/TYKaDTVruTuTEbwW5MEUb6U++kgg\n5zswfT6HGS9AQ1vYzLnn/e7R47RDbvy6t5sMI/UrnLg+u2X/ezGs6a8pdvdFZj4Z\nLPzwC20CIzDi1/j4vVcqgvrbzsmwCWp/on99p4uHW6W8WBTHeE7Z8cP2cRP3tTXA\nGYqfMulzAgMBAAECggEANo6nxXjEST/4Nu1Y79r6q+DfoEfRItlgKQL9t0C8aqEe\nejAHr4TapdcKUfHmdA4SVASqg604g4Nn2PiauawTGeP1roR5LZjxbKzjjUl6eb7x\nm2NZLhN3QBNrL85O7cVBg1f4vp+HZkJrqtSpdl5h40DX7XJ/eXu/CUaMPvxlKcjA\n44xDdtY7O0AQfIT4KMgLFZtbMOqUbYcOmv7wpxoiGWc0q4wsdTwF69r9H5qVlPYy\nN94vJ8ng4YEYgNBAngdmzr3Eq5B61ikNQ6ZOaJK1ZYNa8Jo51g6zSzdmzYx2crQF\no2M/qzDWfMO+VXYWNe7mj6XXbbPI7LqjZ3yd7YEBUQKBgQDKf3aJ3lpvmr5p+EHx\nfn1aF8BYqfRxjawh/UQTnR2iDMuBQM+BcAMTQhfLarRkcS74RrGeEVMEcaylubks\njiFl1iBQqill2+sIIyzV6XddgK7Cw44isBlfbXhU18TQzW0URM/jVpDJJUwkfB/N\nSxDbHSLCXl+OWu0bk2yl6KbA3wKBgQDFRLZHLgka5ALCdkmWY601fY/gKBk6nkBQ\n+Q3O9Q3ziWqAzxy1ufWoFFZXTXKCtGDIkcga5jP8VHjXqlZ4HaBC3bqyBzYUXZKt\nyUWZJrJ4vtOXCQruv2rc1jGSf5yeYJVRHpd/R171LSV6weyrXYL/S2205AaiGIeo\n0ePHILIF7QKBgHNsbDjx0ULERb1JkO0CWJk96JmhZoBDbNaC8obri7SO7oDiXGU/\nX8Febwm37NND4K4MPboHzfY+hVaBopdO/KJ7hzfzhl1VGYct5aSYyz002GiT5zTG\ng+/tCiXyR3FtZrui7Yx8D1NYOyqgxc/S9eyvktyPxo/yLC0Hv2piToqpAoGBAK6M\ndxESjeHqYPq6ebCFcCzFdnosYO56OoSraul18itMqx1gpZGzAsf/fspu7+TxQDYY\nsEwE53jdMbP6t9o+tKCV221Nbi+lAHWfg2LZV8/5YfXhfXf1jdPr/x8WpXmKEnUd\nsYVgnIgqs2AkmYqkCpZkoqUNo0TomZjqZza6GmudAoGABpeUOqRg9MsryjbPJdon\nMnr5LpKS/GXv8ZNKs984gDfMMJ+/+WNsMGII0QHRtKXG4qSosaO8+Mm07mxG+nG7\nqoPb8JKZWQt6hjGE0Ldryvy/J84MeALOyRO48Ldo3+DkeHTHFr00/xHwUfucZdNQ\nwSXYnl3QkP/ZmUzC+Iwmir4=\n-----END PRIVATE KEY-----\n
// CLIENT_EMAIL=sheets@deltav-1556021309349.iam.gserviceaccount.com
// CLIENT_ID=110270082767492461149
// AUTH_URI=https://accounts.google.com/o/oauth2/auth
// TOKEN_URI=https://oauth2.googleapis.com/token
// AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
// CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/sheets%40deltav-1556021309349.iam.gserviceaccount.com

// const creds_json = {
//   type: process.env.TYPE,
//   project_id: process.env.PROJECT_ID,
//   private_key_id: process.env.PRIVATE_KEY_ID,
//   private_key: process.env.PRIVATE_KEY,
//   client_email: process.env.CLIENT_EMAIL,
//   client_id: process.env.CLIENT_ID,
//   auth_uri: process.env.AUTH_URI,
//   token_uri: process.env.TOKEN_URI,
//   auth_provider_x509_cert_url :process.env.AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url :process.env.CLIENT_X509_CERT_URL
// }
