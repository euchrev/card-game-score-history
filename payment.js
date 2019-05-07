
const keySecret = process.env.SECRET_KEY_TEST;
const keyPublic = process.env.PUBLISHABLE_KEY;

const express = require("express");
require("dotenv").config();
const stripe = require("stripe")(keySecret);

const app = express();


// function stripePayment() {
//   (async () => {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: [{
//         name: 'EuchreV Subscription',
//         description: 'Lifetime subscription of EuchreV',
//         images: ['https://example.com/t-shirt.png'],
//         amount: 1000,
//         currency: 'usd',
//         quantity: 1,
//       }],
//       success_url: 'https://localhost:3000/payment',
//       cancel_url: 'https://localhost:3000/payment'
//     })
//     console.log(session);
//   })();
// }

