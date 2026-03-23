// test_mail.js
const nodemailer = require('nodemailer');

var transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "f3309a2d91f3f2",
    pass: "****1f52"
  }
});

// Kiem tra ket noi
transporter.verify(function(error, success) {
    if (error) {
        console.log("Loi ket noi: " + error);
    } else {
        console.log("Ket noi thanh cong! San sang gui mail.");
    }
});