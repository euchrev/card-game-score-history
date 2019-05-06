const keyPublishable = process.env.PUBLISHABLE_KEY_TEST;
const keySecret = process.env.SECRET_KEY_TEST;

const express = require("express");
const stripe = require("stripe")(keySecret);
// BODY PARSER?????

const app = express();

app.post("/payment", (req, res) => payment.processPayment(req, res));


module.exports = {
  processPayment: function(req, res) {
    console.log(req);
    let amount = 1000;

    stripe.customers
      .create({
        email: req.body.email,
        card: req.body.id
      })
      .then(customer => {
        stripe.charges
          .create({
            amount,
            description: `Lifetime subscription for EuchreV`,
            currency: "usd",
            customer: customer.id
          })
          .then(charge => res.send(charge))
          .catch(err => {
            console.log("Error:", err);
            res.status(500).send({ error: "Purchase Failed" });
          });
      });
  }
};
