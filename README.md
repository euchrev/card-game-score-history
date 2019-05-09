# Card Game Score History

**Authors:** Rory Letteney, Austin Jess, Floyd Orr, Michele Saba
**Version:** 0.22.10

## Overview

## Architecture

## Change log
- 05-09-2019 *11:38* - Dashboard views now render to page correctly when clicked.
- 05-09-2019 *10:03pm* - '/new-game' route populates selector on newgame.ejs with names of players.
- 05-08-2019 *9:16pm* - Now able to populate the games table and group_members table with data from the provided Google spreadsheet.
- 05-08-2019 *4:24pm* - Dashboard now receiving all of the data it needs to render the leaderboards.
- 05-08-2019 *9:26am* - Signup form is created and hookedup. Paid status is updated upon payment completion.
- 05-07-2019 *1:54pm* - Google sheet is reading from DB
- 05-07-2019 *2:15pm* - Server now has functionality for adding, updating, and deleting members. Also has starter code for member manipulation forms.
- 05-07-2019 *1:17pm* - Stripe Checkout functionality is working. Removed payment.js and moved functions into server.js file.
- 05-07-2019 *11:06am* - Refactored some of the Stripe API code to work for one-time purchases. NOT FUNCTIONAL
- 05-07-2019 *9:54am* - Users now have the ability to logout of their group.
- 05-06-2019 *6:33pm* - Created payment endpoint to access Stripe API (payment not accepting card - further testing needed)
- 05-06-2019 *6:23pm* - Login group endpoint validating group name and password, and logging user into the group's dashboard.
- 05-06-2019 *4:41pm* - Create group endpoint validating email and password, hashing password, saving group information to the database.

## Credits and Collaborations

**General Email Regex (RFC 5322 Official Standard)** - https://emailregex.com/
