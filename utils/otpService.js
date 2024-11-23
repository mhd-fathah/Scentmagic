const nodemailer = require('nodemailer');
const crypto = require('crypto')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fathu6214@gmail.com',
    pass: 'jawlcedqdluzygfu',
  },
});


const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString(); 
};

async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: 'fathu6214@gmail.com',
    to: email,
    subject: 'Your OTP for Email Verification',
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP sent successfully');
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
}

module.exports = { sendOTPEmail, generateOTP  };
