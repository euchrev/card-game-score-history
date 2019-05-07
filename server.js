const pg = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const express = require('express');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = process.env.SECRET;
const GoogleSpreadsheet = require("google-spreadsheet");
const creds = require("./client_secret.json");
const async = require("async");
const SECRET_KEY_TEST = process.env.SECRET_KEY_TEST;
const stripe = require('stripe')(SECRET_KEY_TEST);

app.set('view engine', 'ejs');

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
const doc = new GoogleSpreadsheet(
  "10PIDgiRsDs7JxNNYZBknTV8y78gCBt20-DPifqLCgJc"
);

async.series(
  [
    function setAuth(step) {
      // console.log("set auth");

      doc.useServiceAccountAuth(creds, step);
    },

    function getInfoAndWorksheets(step) {
      // console.log("get data");
      doc.getInfo(function (err, info) {
        // console.log("Loaded doc: " + info.title + " by " + info.author.email);
        sheet = info.worksheets[0];
        // console.log(
        //   "sheet 1: " +
        //   sheet.title +
        //   " " +
        //   sheet.rowCount +
        //   "x" +
        //   sheet.colCount
        // );
        sheet.getRows({
            offset: 1,
            limit: 20,
            orderby: "col2"
          },
          function (err, rows) {
            // console.log(rows);
          }
        );
        step();
      });
    }
  ],
  function (err) {
    if (err) {
      console.log("ERROR:" + err);
    }
  }
);

app.use(express.static('public'));

app.use(
  express.urlencoded({
    extended: true
  })
);

app.get('/', (req, res) => res.render('pages/index'));
app.get('/login', (req, res) => res.render('pages/login'));
app.get('/signup', (req, res) => res.render('pages/signup'));
app.get('/dashboard', (req, res) => console.log(req.cookies.auth));
app.get('/groups', (req, res) => loginGroup(req.body, res));
app.get('/payment', (req, res) => stripePayment(req, res));
app.get(
  '/logout',
  (req, res) => res.clearCookie('auth') && res.redirect('/login')
);

app.post('/groups', (req, res) => createGroup(req.body, res));
app.post('/members', (req, res) => addMember(req, res));

app.put('/members', (req, res) => updateMember(req, res));

app.delete('/members', (req, res) => deleteMember(req, res));

function stripePayment(req, res) {
  (async () => {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        name: 'EuchreV Subscription',
        description: 'Lifetime subscription of EuchreV',
        images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Euchre.jpg/220px-Euchre.jpg'],
        amount: 1000,
        currency: 'usd',
        quantity: 1
      }],
      success_url: 'https://localhost:3000/dashboard',
      cancel_url: 'https://localhost:3000/'
    });
    res.render('pages/payment.ejs', {
      sessionId: session.id
    })
  })();
}

const lookupGroup = handler => {
  const SQL = 'SELECT * FROM groups WHERE name=$1';
  const values = [handler.query.name];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length ?
      handler.cacheMiss(results) :
      handler.cacheHit(results)
    );
};

const lookupMember = handler => {
  const SQL = 'SELECT * FROM group_members WHERE name=$1 AND group_id=$2';
  const values = [`${handler.query.firstname} ${handler.query.lastname}`, handler.query.groupID];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length ?
      handler.cacheMiss(results) :
      handler.cacheHit(results)
    );
};

function Group(info) {
  (this.name = info.name),
  (this.email = info.email),
  (this.password = info.password),
  (this.paid = false);
}

function Member(info) {
  (this.name = info.name),
  (this.groupID = info.groupID);
}

Group.prototype.save = function () {
  const SQL =
    'INSERT INTO groups (name, email, password, paid) VALUES($1,$2,$3,$4) RETURNING id';
  const values = [this.name, this.email, this.password, this.paid];
  return client.query(SQL, values);
};

Member.prototype.save = function () {
  const SQL = 'INSERT INTO group_members (name, group_id) VALUES($1,$2)';
  const values = [this.name, this.groupID];
  return client.query(SQL, values);
}

Member.update = function (info) {
  const SQL = 'UPDATE group_members SET name=$1 WHERE name=$2 AND group_id=$3';
  const values = [info.newName, info.currentName, info.groupID];
  return client.query(SQL, values);
}

Member.delete = function (info) {
  const SQL = 'DELETE FROM group_members WHERE name=$1 AND group_id=$2';
  const values = [info.name, info.groupID];
  return client.query(SQL, values);
}

const createGroup = (req, res) => {
  const validation = [
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|'(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*')@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(
      req.email
    ),
    /(?=.{8,})/.test(req.password)
  ];
  const handler = {
    query: req,
    cacheHit: result => {
      res.send('Cache hit');
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
          const token = jwt.sign({
              id: result.rows[0].id
            },
            SECRET
          );
          res.clearCookie('auth');
          res.cookie('auth', token);
          res.redirect('/payment');
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
        const token = jwt.sign({
            id: result.rows[0].id
          },
          SECRET
        );
        res.clearCookie('auth');
        res.cookie('auth', token);
        res.redirect('/dashboard');
      } else {
        handler.cacheMiss();
      }
    },
    cacheMiss: result => {
      res.send('Cache miss');
    }
  };

  lookupGroup(handler);
};

const addMember = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECRET, (err, decoded) => decoded.id);
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const handler = {
    query: {
      firstname,
      lastname,
      groupID
    },
    cacheHit: result => {
      console.log('Member exists');
    },
    cacheMiss: result => {
      const newMember = new Member({
        name: `${req.body.firstname} ${req.body.lastname}`,
        groupID
      });
      newMember.save()
        .then(result => res.redirect('/members'));
    }
  }

  lookupMember(handler);
}

const updateMember = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECRET, (err, decoded) => decoded.id);
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const currentName = req.body.currentname;
  const handler = {
    query: {
      firstname,
      lastname,
      groupID
    },
    cacheHit: result => {
      const memberInfo = {
        newName: `${firstname} ${lastname}`,
        currentName,
        groupID
      }
      Member.update(memberInfo)
        .then(result => res.redirect('/members'));
    },
    cacheMiss: result => {
      console.log('Member does not exist');
    }
  }

  lookupMember(handler);
}

const deleteMember = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECRET, (err, decoded) => decoded.id);
  const name = `${req.body.firstname} ${req.body.lastname}`;
  const handler = {
    query: {
      groupID,
      name
    },
    cacheHit: result => {
      Member.delete(handler.query)
        .then(result => res.redirect('/members'));
    },
    cacheMiss: result => {
      console.log('Member does not exist');
    }
  }

  lookupMember(handler);
}

app.listen(PORT, console.log(`App listening on ${PORT}.`));