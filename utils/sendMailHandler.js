let nodemailer = require('nodemailer');

// Sửa tên biến từ 'transport' thành 'transporter' để khớp với các hàm bên dưới
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "f3309a2d91f3f2",
    pass: "e1d387e3251f52" // LƯU Ý: Dán đúng password thật của bạn vào đây, không để dấu ****
  }
});

module.exports = {
    sendMail: async function (to, url) {
        // Sử dụng biến 'transporter' đã khai báo ở trên
        return await transporter.sendMail({
            from: '"Admin" <admin@nnptud.com>',
            to: to,
            subject: "Mail reset password",
            text: "Click vào đây để đổi password", 
            html: `Click vào <a href="${url}">đây</a> để đổi password`,
        });
    },
    sendPasswordMail: async function (to, username, password) {
        // Sử dụng biến 'transporter' đã khai báo ở trên
        return await transporter.sendMail({
            from: '"Admin" <admin@nnptud.com>',
            to: to,
            subject: "Thông tin tài khoản của bạn",
            text: `Chào ${username}, Password của bạn là: ${password}`,
            html: `<b>Chào ${username}</b>,<br>Password của bạn là: <code>${password}</code>`
        });
    }
}