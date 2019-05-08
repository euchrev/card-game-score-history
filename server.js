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
const SECURE_KEY = process.env.SECURE_KEY;
const GoogleSpreadsheet = require("google-spreadsheet");
const creds = {
  "type": process.env.TYPE,
  "project_id": process.env.PROJECT_ID,
  "private_key_id": process.env.PRIVATE_KEY_ID,
  "private_key": process.env.PRIVATE_KEY,
  "client_email": process.env.CLIENT_EMAIL,
  "client_id": process.env.CLIENT_ID,
  "auth_uri": process.env.AUTH_URI,
  "token_uri": process.env.TOKEN_URI,
  "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_X509_CERT_URL,
  "client_x509_cert_url": process.env.CLIENT_X509_CERT_URL
};
const async = require("async");
const STRIPE_SECRET_KEY_TEST = process.env.STRIPE_SECRET_KEY_TEST;
const stripe = require('stripe')(STRIPE_SECRET_KEY_TEST);

app.set('view engine', 'ejs');

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(express.static('./public'));

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

      doc.useServiceAccountAuth(creds, step);
    },

    function getInfoAndWorksheets(step) {
      doc.getInfo(function(err, info) {
        sheet = info.worksheets[0];
        
        sheet.getRows(
          {
            offset: 1,
            limit: 20,
            orderby: "col2"
          },
          function(err, rows) {
            let names =[];
           
            rows.forEach((item, i)=> {
              //makes sure no duplicate names are in array
              names.push(item.team1player1)
              names.push(item.team1player2)
              names.push(item.team2player1)
              names.push(item.team1player2)
            })
            let uniqueArray = names.filter( (item, pos, self)=> {
              return self.indexOf(item) == pos;

            })
              // put stuff in Postresql here

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


app.get('/', (req, res) => res.render('pages/index'));
app.get('/login', (req, res) => res.render('pages/login'));
app.get('/signup', (req, res) => res.render('pages/signup'));
// app.get('/dashboard', (req, res) => updateGroup(req.cookies.auth, res));
app.get('/dashboard', (req, res) => renderDashboard(req, res));
app.get('/groups', (req, res) => loginGroup(req.query, res));
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
      success_url: 'https://card-game-score-history.herokuapp.com/dashboard',
      cancel_url: 'https://card-game-score-history.herokuapp.com/'
    });
    res.render('pages/payment.ejs', {
      sessionId: session.id
    });    
  })();
}

const lookupGroup = handler => {
  const SQL = handler.query.groupname ? 'SELECT * FROM groups WHERE name=$1' : 'SELECT * FROM groups WHERE id=$1';
  const values = [handler.query.groupname ? handler.query.groupname : handler.query];
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

const getMembers = groupID => {
  const SQL = 'SELECT * FROM group_members WHERE group_id=$1';
  const values = [groupID];
  return client.query(SQL, values);
}

const getGames = groupID => {
  const SQL = 'SELECT * FROM games WHERE group_id=$1';
  const values = [groupID];
  return client.query(SQL, values);
}

function Group(info) {
  (this.name = info.groupname),
  (this.email = info.email),
  (this.password = info.password),
  (this.paid = false);
}

function Member(info) {
  (this.name = info.groupname),
  (this.groupID = info.groupID);
}

Group.prototype.save = function () {
  const SQL =
    'INSERT INTO groups (name, email, password, paid) VALUES($1,$2,$3,$4) RETURNING id';
  const values = [this.name, this.email, this.password, this.paid];
  return client.query(SQL, values);
};

Group.update = function (data) {
  const SQL = 'UPDATE groups SET paid=$1 WHERE id=$2';
  const values = [data.value, data.id];
  return client.query(SQL, values);
}

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
        groupname: req.groupname,
        email: req.email,
        password: hashedPassword
      };
      if (validation.every(result => result === true)) {
        const newGroup = new Group(groupInfo);
        newGroup.save().then(result => {
          const token = jwt.sign({
              id: result.rows[0].id
            },
            SECURE_KEY
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
          SECURE_KEY
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

const updateGroup = (req, res) => {
  const handler = {
    query: jwt.verify(req, SECURE_KEY, (err, decoded) => decoded.id),
    cacheHit: result => {
      Group.update({ value: true, id: result.rows[0].id });
    },
    cacheMiss: result => {
      console.log('Group doesn\'t exist');
    }
  }

  lookupGroup(handler);
}

const addMember = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
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
  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
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
  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
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

const renderDashboard = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
  const handler = {
    query: groupID,
    cacheHit: results => {
      let members = [];
      let games = [];
      let memberLeaderboard = [];
      let teamLeaderboard = [];

      function MemberStats(info) {
        this.name = info.name,
        this.wins = 0,
        this.losses = 0,
        this.winPercentage = 0;
      }

      MemberStats.prototype.addWin = function() {
        this.wins++;
      }

      MemberStats.prototype.addLoss = function() {
        this.losses++;
      }

      MemberStats.prototype.calcWinPercentage = function() {
        this.winPercentage = this.wins / (this.wins + this.losses);
      }

      getMembers(groupID)
        .then(results => members = results.rows)
        .then(() => getGames(groupID))
        .then(results => games = results.rows)
        .then(() => members = members.map(member => { return { id: member.id, name: member.name } }))
        .then(() => games = games.map(game => { return { date: parseInt(game.date), winning_team: game.winning_team, losing_team: game.losing_team, notes: game.notes }}))
        .then(() => members.forEach(member => {
          games.forEach(game => {
            game.winning_team = game.winning_team.map(player => player === member.id ? member.name : player);
            game.losing_team = game.losing_team.map(player => player === member.id ? member.name : player);
          });
          let newEntry = new MemberStats(member);
          games.forEach(game => {
            game.winning_team.includes(member.name)
            ? newEntry.addWin()
            : (game.losing_team.includes(member.name)
              ? newEntry.addLoss()
              : '');
          })
          newEntry.calcWinPercentage();
          memberLeaderboard.push(newEntry);
        }))
        .then(() => console.log(memberLeaderboard));
    },
    cacheMiss: results => {
      console.log('Group does not exist');
    }
  }

  lookupGroup(handler);
}

app.listen(PORT, console.log(`App listening on ${PORT}.`));