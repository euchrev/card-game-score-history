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

// async.series(
//   [
//     function setAuth(step) {

//       doc.useServiceAccountAuth(creds, step);
//     },


//     function getInfoAndWorksheets(step) {
//       doc.getInfo(function(err, info) {
//         sheet = info.worksheets[0];

//         sheet.getRows(
//           {
//             offset: 1,
//             orderby: "col2"
//           },
//           function(err, rows) {
//             // rows.forEach(row => row.individuals ? addMember({ name: row.individuals, groupID: 1 }) : '');
//             // client.query("INSERT INTO group_members (name, group_id) VALUES('Anna', 1)");

//             function Game(date, winningTeam, losingTeam, notes, groupID) {
//               this.date = date,
//               this.winningTeam = winningTeam || [],
//               this.losingTeam = losingTeam || [],
//               this.notes = notes,
//               this.groupID = groupID;
//             }

//             Game.prototype.save = function() {
//               const SQL = 'INSERT INTO games (date, winning_team, losing_team, notes, group_id) VALUES($1,$2,$3,$4,$5)';
//               const values = [this.date, this.winningTeam, this.losingTeam, this.notes, this.groupID];

//               // client.query(SQL, values);
//             }

//             let teamNames = [];
//             let memberIDs = [];
//             let teams = [];
//             let dates = [];
//             let notes = [];
//             let winningTeams = [];
//             let losingTeams = [];
//             rows.forEach(row => {
//               row.teamwinloss ? teams.push({ team: row.teamwinloss, teammember1: row.teammember1, teammember2: row.teammember2 }) : '';
//               row.teamwinloss ? teamNames.push(row.teamwinloss) : '';
//             })

//             client.query(`SELECT id, name FROM group_members WHERE group_id=1`)
//               .then(result => result.rows.forEach(row => memberIDs.push({ name: row.name, id: row.id })))
//               .then(result => {
//                 teams = teams.map(team => {
//                   for (let i = 0; i < memberIDs.length; i++) {
//                     if (team.teammember1 === memberIDs[i].name) {
//                       team.teammember1 = memberIDs[i].id;
//                     }
//                     if (team.teammember2 === memberIDs[i].name) {
//                       team.teammember2 = memberIDs[i].id;
//                     }
//                   }
//                   return team;
//                 })

//                 rows.forEach(row => {
//                   for (let i = 0; i < teams.length; i++) {
//                     row.winningteam === teams[i].team ? winningTeams.push([teams[i].teammember1, teams[i].teammember2]) : '';
//                     row.losingteam === teams[i].team ? losingTeams.push([teams[i].teammember1, teams[i].teammember2]) : '';
//                   }
//                   teamNames.includes(row.winningteam) ? dates.push(row.date) : '';
//                   teamNames.includes(row.winningteam) ? notes.push(row.notes) : '';
//                 })
//                 dates = dates.map(date => date.split('/').map(piece => piece.split('').length > 1 ? piece : `0${piece}`).join('/')).map(date => new Date(date).getTime());

//                 dates.forEach((date, idx) => {
//                  // new Game(date, winningTeams[idx], losingTeams[idx], notes[idx], 1).save();
//                 })
//               });
//           }
//         );
//         step();
//       });
//     }
//   ],
//   function(err) {
//     if (err) {
//       console.log("ERROR:" + err);
//     }
//   }
// );


app.get('/', (req, res) => res.render('pages/index'));
app.get('/login', (req, res) => res.render('pages/login'));
app.get('/signup', (req, res) => res.render('pages/signup'));
app.get('/about', (req, res) => res.render('pages/about'));
app.get('/dashboard', (req, res) => renderDashboard(req, res));
app.get('/groups', (req, res) => loginGroup(req.query, res));
app.get('/payment', (req, res) => stripePayment(req, res));
app.get( '/logout', (req, res) => res.clearCookie('auth') && res.redirect('/login'));
app.get('/new-game',(req, res) => newGameScore(req, res));
app.post('/games', (req, res) => addGame(req.body, res));
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

const newGameScore = (req, res) => {
  const SQL = 'SELECT name FROM group_members WHERE group_id=$1';
  const values = [jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id)]
  return client.query(SQL, values).then( name => {
    return {members: name.rows};
  })
 }

const lookupGroup = handler => {
  const SQL = handler.query.groupname ? 'SELECT * FROM groups WHERE name=$1' : 'SELECT * FROM groups WHERE id=$1';
  const values = [handler.query.groupname ? handler.query.groupname : handler.query];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length
      ? handler.cacheMiss(results)
      : handler.cacheHit(results)
    );
};

const lookupMember = handler => {
  const SQL = 'SELECT * FROM group_members WHERE name=$1 AND group_id=$2';
  const values = [handler.query.name, handler.query.groupID];
  return client
    .query(SQL, values)
    .then(results =>
      !results.rows.length
      ? handler.cacheMiss(results)
      : handler.cacheHit(results)
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
  (this.name = info.name),
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
    query: req,
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
  const groupID = req.body ? jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id) : req.groupID;
  const name = req.body ? req.body.name : req.name;
  const handler = {
    query: {
      name,
      groupID
    },
    cacheHit: result => {
      console.log('Member exists');
    },
    cacheMiss: result => {
      const newMember = new Member({
        name,
        groupID
      });
      newMember.save()
        .then(result => req.body ? res.redirect('/members') : '');
    }
  }

  lookupMember(handler);
}

const updateMember = (req, res) => {
  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
  const name = req.body.name;
  const currentName = req.body.currentname;
  const handler = {
    query: {
      name,
      groupID
    },
    cacheHit: result => {
      const memberInfo = {
        newName: name,
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
  const name = req.body.name;
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
      updateGroup(groupID, res);
      let members = [];
      let teams = [];
      let games = [];
      let memberLeaderboard = [];
      let teamLeaderboard = [];

      // CONSTRUCTOR FOR EACH memberLeaderboard ENTRY
      function MemberStats(info) {
        this.name = info.name,
        this.wins = 0,
        this.losses = 0,
        this.winPercentage = 0
        this.addWin = function() {
          this.wins++;
        },
        this.addLoss = function() {
          this.losses++;
        },
        this.calcWinPercentage = function() {
          this.winPercentage = this.wins / (this.wins + this.losses);
        };
      }

      // CONSTRUCTOR FOR EACH teamLeaderboard ENTRY
      function TeamStats(info) {
        this.playerOne = info[0],
        this.playerTwo = info[1],
        this.wins = 0,
        this.losses = 0,
        this.winPercentage = 0
        this.addWin = function() {
          this.wins++;
        },
        this.addLoss = function() {
          this.losses++;
        },
        this.calcWinPercentage = function() {
          this.winPercentage = this.wins / (this.wins + this.losses);
        };
      }

      // GATHER LIST OF MEMBERS FROM DATABASE
      getMembers(groupID)
        .then(results => {
          members = results.rows;
          // GATHER LIST OF GAME ENTRY FROM DATABASE
          return getGames(groupID);
        })
        .then(results => {
          games = results.rows;
          // CONVERT EACH members ENTRY INTO AN OBJECT WITH ONLY RELEVANT INFORMATION
          members = members.map(member => { return { id: member.id, name: member.name } });
          // CONVERT EACH games ENTRY INTO AN OBJECT WITH ONLY RELEVANT INFORMATION
          games = games.map(game => { return { date: parseInt(game.date), winning_team: game.winning_team, losing_team: game.losing_team, notes: game.notes }});
          // STANDARDIZE EACH games ENTRY
          games.forEach(game => {
            // SORT winning_team and losing_team ARRAYS FOR FUTURE COMPARISON USE
            game.winning_team = game.winning_team.sort((a,b) => a - b);
            game.losing_team = game.losing_team.sort((a,b) => a - b);
            // PUSH UNIQUE TEAM CONFIGURATIONS TO THE teams ARRAY
            if (!teams.includes(game.winning_team)) {
              teams.push(game.winning_team);
            } else if (!teams.includes(game.losing_team)) {
              teams.push(game.losing_team);
            }
          });
          members.forEach(member => {
            // CONVERT THE INTEGERS IN winning_team AND losing_team ARRAYS TO THEIR MEMBER NAME
            games.forEach(game => {
              game.winning_team = game.winning_team.map(player => player === member.id ? member.name : player);
              game.losing_team = game.losing_team.map(player => player === member.id ? member.name : player);
            });
            // INSTANTIATE NEW memberLeaderboard ENTRY
            let newEntry = new MemberStats(member);
            // CALCULATE TOTAL WINS AND TOTAL LOSSES FOR NEW memberLeaderboard ENTRY
            games.forEach(game => {
              game.winning_team.includes(member.name)
              ? newEntry.addWin()
              : (game.losing_team.includes(member.name)
                ? newEntry.addLoss()
                : '');
            })
            // CALCULATE winPercentage FOR NEW memberLeaderboard ENTRY
            newEntry.calcWinPercentage();
            memberLeaderboard.push(newEntry);
          });
          // CONVERT THE teams IDs TO member NAMES
          members.forEach(member => {
            teams.forEach((team, idx) => {
              teams[idx] = team.map(player => player === member.id ? member.name : player );
            });
          });
          teams.forEach(team => {
            // INSTANTIATE NEW teamLeaderboard ENTRY
            let newEntry = new TeamStats(team);
            // CALCULATE TOTAL WINS AND LOSSES FOR NEW teamLederboard ENTRY
            games.forEach(game => {
              game.winning_team[0] === team[0] && game.winning_team[1] === team[1]
              ? newEntry.addWin()
              : (game.losing_team[0] === team[0] && game.losing_team[1] === team[1]
                ? newEntry.addLoss()
                : '');
            })
            // CALCULATE winPercentage FOR NEW teamLeaderboard ENTRY
            newEntry.calcWinPercentage();
            teamLeaderboard.push(newEntry);
          });
          // RENDER THE dashboard PAGE AND PASS THE LEADERBOARDS TO IT
          res.render('pages/dashboard', { memberLeaderboard, teamLeaderboard });
        });
    },
    cacheMiss: results => {
      res.redirect('/login');
    }
  }

  lookupGroup(handler);
}

const addGame = (req, res) => {
  function Game(winningTeam, losingTeam, notes, groupID) {
    this.date = Date.now(),
    this.winningTeam = winningTeam,
    this.losingTeam = losingTeam,
    this.notes = notes,
    this.groupID = groupID;
  }

  Game.prototype.save = function() {
    const SQL = 'INSERT INTO games (date, winning_team, losing_team, notes, group_id) VALUES($1,$2,$3,$4,$5)';
    const values = [this.date, this.winningTeam, this.losingTeam, this.notes, this.groupID];
  
    return client.query(SQL, values);
  }

  const groupID = jwt.verify(req.cookies.auth, SECURE_KEY, (err, decoded) => decoded.id);
  let winningTeam = [];
  let losingTeam = [];
  const SQL = 'SELECT * FROM group_members WHERE name=$1 OR name=$2 OR name=$3 OR name=$4';
  const values = [req['winning-player1'], req['winning-player2'], req['losing-player1'], req['losing-player2']];
  client.query(SQL, values)
    .then(results => {
      results.rows.forEach(row => {
        if (row.name === req['winning-player1'] || row.name === req['winning-player2']) {
          winningTeam.push(row.id);
        } else {
          losingTeam.push(row.id);
        }
      });
      new Game(winningTeam, losingTeam, req.notes, groupID).save()
        .then(() => res.redirect('/dashboard'));
    });
}

app.listen(PORT, console.log(`App listening on ${PORT}.`));